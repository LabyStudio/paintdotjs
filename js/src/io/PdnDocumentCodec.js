/**
 * Reads and writes Paint.NET's native PDN3 container.
 *
 * A PDN3 file consists of a small XML header, an NRBF object graph and one
 * deferred, chunked BGRA pixel block per layer. The object graph templates in
 * assets/pdn/templates were produced by Paint.NET 5.1.12 itself. Keeping the
 * binary-format details here prevents them from leaking into the UI/file code.
 */
class PdnDocumentCodec {

    static MAGIC = [0x50, 0x44, 0x4e, 0x33];
    static TEMPLATE_WIDTH = 257;
    static TEMPLATE_HEIGHT = 263;
    static PIXEL_CHUNK_SIZE = 262144;

    static isNativePdn(bytes) {
        return bytes.length >= this.MAGIC.length
            && this.MAGIC.every((value, index) => bytes[index] === value);
    }

    static async decode(bytes) {
        if (typeof Nrbf === "undefined" || typeof Nrbf.deserialize !== "function") {
            throw new Error("The Paint.NET document decoder is unavailable");
        }
        if (bytes.length < 11) throw new Error("The .pdn file is truncated");

        const headerLength = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16);
        const graphMarker = 7 + headerLength;
        if (graphMarker + 2 > bytes.length || bytes[graphMarker] !== 0 || bytes[graphMarker + 1] !== 1) {
            throw new Error("Unsupported Paint.NET document encoding");
        }

        const graphStart = graphMarker + 2;
        let graph = bytes.subarray(graphStart);
        let root;
        try {
            root = Nrbf.deserialize(graph);
        } catch (error) {
            // Builds which first introduced native PDN saving wrote the blend
            // mode over four bytes of its NRBF record header. Repair only that
            // precisely identifiable layout so those documents remain usable.
            const layerCount = this.readLayerCountFromHeader(bytes.subarray(7, graphMarker));
            const repaired = await this.repairLegacyBlendModeRecords(graph, layerCount);
            if (repaired === null) throw error;
            graph = repaired;
            root = Nrbf.deserialize(graph);
        }
        const width = Number(root.members.width);
        const height = Number(root.members.height);
        const layerList = root.members.layers.members;
        const layerCount = Number(layerList["ArrayList+_size"]);
        const layerObjects = layerList["ArrayList+_items"].slice(0, layerCount);

        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
            || width > 32768 || height > 32768 || layerCount < 1 || layerObjects.length !== layerCount) {
            throw new Error("Invalid Paint.NET document structure");
        }

        const pixelBlocks = await this.findPixelBlocks(
            bytes,
            graphStart,
            width * height * 4,
            layerCount
        );
        if (pixelBlocks.length !== layerCount) {
            throw new Error("Could not decode the Paint.NET layer pixels");
        }

        const layers = layerObjects.map((layerObject, index) => {
            if (layerObject === null || layerObject === undefined) {
                throw new Error("Invalid Paint.NET layer entry");
            }

            const properties = layerObject.members["Layer+properties"].members;
            return {
                name: properties.name || "Layer " + (index + 1),
                visible: properties.visible !== false,
                isBackground: !!properties.isBackground,
                opacity: properties.opacity === undefined ? 255 : properties.opacity,
                blendMode: LayerProperties.getBlendMode(
                    properties.blendMode?.members?.value__ ?? properties.blendMode
                ).value,
                canvas: this.createCanvasFromBgra(pixelBlocks[index], width, height)
            };
        });

        return {width, height, activeLayer: layerCount - 1, layers};
    }

    static async encode(documentModel) {
        const layers = documentModel.getLayers().list();
        if (layers.length < 1 || layers.length > 64) {
            throw new Error("Native .pdn saving currently supports 1 to 64 layers.");
        }

        const width = documentModel.getWidth();
        const height = documentModel.getHeight();
        const response = await fetch("assets/pdn/templates/" + layers.length + ".bin");
        if (!response.ok) throw new Error("Could not load the Paint.NET document template");

        const template = new Uint8Array(await response.arrayBuffer());
        const graph = this.patchTemplate(template, width, height, layers);
        const parts = [this.createHeader(width, height, layers.length), graph];

        for (const layer of layers) {
            parts.push(await this.encodeSurface(layer.getSurface().getCanvas()));
        }

        return new Blob(parts, {type: "application/x-paintdotnet"});
    }

    static createHeader(width, height, layerCount) {
        const xml = new TextEncoder().encode(
            '<pdnImage width="' + width + '" height="' + height + '" layers="' + layerCount
            + '" savedWithVersion="5.112.9563.32325"><custom></custom></pdnImage>'
        );
        if (xml.length > 0xffffff) throw new Error("Paint.NET header is too large");

        const header = new Uint8Array(9 + xml.length);
        header.set(this.MAGIC, 0);
        header[4] = xml.length & 255;
        header[5] = (xml.length >>> 8) & 255;
        header[6] = (xml.length >>> 16) & 255;
        header.set(xml, 7);

        // The two bytes following the XML are the NRBF stream marker.
        header[7 + xml.length] = 0;
        header[8 + xml.length] = 1;
        return header;
    }

    static createCanvasFromBgra(bgra, width, height) {
        const rgba = new Uint8ClampedArray(bgra.length);
        for (let offset = 0; offset < rgba.length; offset += 4) {
            rgba[offset] = bgra[offset + 2];
            rgba[offset + 1] = bgra[offset + 1];
            rgba[offset + 2] = bgra[offset];
            rgba[offset + 3] = bgra[offset + 3];
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").putImageData(new ImageData(rgba, width, height), 0, 0);
        return canvas;
    }

    static async findPixelBlocks(bytes, searchStart, expectedLength, layerCount) {
        // Deferred pixel blocks directly follow the NRBF graph, but NRBF does not
        // expose its consumed byte count. Validate every possible block header and
        // accept only a complete chain with exactly one block per layer.
        for (let start = searchStart; start + 13 <= bytes.length; ++start) {
            const format = bytes[start];
            if (format !== 0 && format !== 1) continue;

            const chunkSize = this.readUint32BE(bytes, start + 1);
            if (chunkSize < 512 || chunkSize > 64 * 1024 * 1024) continue;
            if (this.readUint32BE(bytes, start + 5) !== 0) continue;

            const firstSize = this.readUint32BE(bytes, start + 9);
            if (firstSize < 1 || start + 13 + firstSize > bytes.length) continue;
            if (format === 0 && (bytes[start + 13] !== 0x1f || bytes[start + 14] !== 0x8b)) continue;

            try {
                const blocks = [];
                let position = start;
                for (let index = 0; index < layerCount; ++index) {
                    const block = await this.readPixelBlock(bytes, position, expectedLength);
                    blocks.push(block.pixels);
                    position = block.end;
                }
                return blocks;
            } catch (_) {
                // This candidate was regular NRBF metadata rather than pixel data.
            }
        }

        return [];
    }

    static async readPixelBlock(bytes, start, expectedLength) {
        const format = bytes[start];
        const chunkSize = this.readUint32BE(bytes, start + 1);
        if ((format !== 0 && format !== 1) || chunkSize < 1) {
            throw new Error("Invalid pixel block");
        }

        const chunkCount = Math.ceil(expectedLength / chunkSize);
        const pixels = new Uint8Array(expectedLength);
        let position = start + 5;

        for (let chunk = 0; chunk < chunkCount; ++chunk) {
            if (position + 8 > bytes.length || this.readUint32BE(bytes, position) !== chunk) {
                throw new Error("Invalid pixel chunk index");
            }

            const dataSize = this.readUint32BE(bytes, position + 4);
            position += 8;
            if (dataSize < 1 || position + dataSize > bytes.length) {
                throw new Error("Truncated pixel chunk");
            }

            const payload = bytes.subarray(position, position + dataSize);
            const raw = format === 0 ? await this.gunzip(payload) : payload;
            const expectedChunkLength = Math.min(chunkSize, expectedLength - chunk * chunkSize);
            if (raw.length !== expectedChunkLength) throw new Error("Invalid pixel chunk size");

            pixels.set(raw, chunk * chunkSize);
            position += dataSize;
        }

        return {pixels, end: position};
    }

    static patchTemplate(template, width, height, layers) {
        const bytes = template.slice();
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const templateStride = this.TEMPLATE_WIDTH * 4;
        let surfaceDimensions = 0;

        for (let offset = 0; offset + 12 <= bytes.length; ++offset) {
            if (view.getUint32(offset, true) !== this.TEMPLATE_WIDTH
                || view.getUint32(offset + 4, true) !== this.TEMPLATE_HEIGHT
                || view.getUint32(offset + 8, true) !== templateStride) {
                continue;
            }

            view.setUint32(offset, width, true);
            view.setUint32(offset + 4, height, true);
            view.setUint32(offset + 8, width * 4, true);
            ++surfaceDimensions;
            offset += 11;
        }

        const widthReplacements = this.replaceUint32(bytes, this.TEMPLATE_WIDTH, width);
        const heightReplacements = this.replaceUint32(bytes, this.TEMPLATE_HEIGHT, height);
        const templateByteLength = BigInt(this.TEMPLATE_WIDTH * this.TEMPLATE_HEIGHT * 4);
        const pixelByteLength = BigInt(width) * BigInt(height) * 4n;
        const lengthReplacements = this.replaceUint64(bytes, templateByteLength, pixelByteLength);

        if (surfaceDimensions !== layers.length || widthReplacements !== layers.length + 1
            || heightReplacements !== layers.length + 1 || lengthReplacements !== layers.length) {
            throw new Error("Paint.NET document template validation failed");
        }

        return this.patchLayerProperties(bytes, layers);
    }

    static patchLayerProperties(template, layers) {
        const encoder = new TextEncoder();
        const replacements = [];

        for (let index = 0; index < layers.length; ++index) {
            const marker = encoder.encode("PDJ_LAYER_" + String(index).padStart(4, "0"));
            const markerOffset = this.findByteSequence(template, marker);
            if (markerOffset < 1 || template[markerOffset - 1] !== marker.length) {
                throw new Error("Paint.NET layer template is invalid");
            }

            const properties = layers[index].properties;
            const propertyOffset = markerOffset + marker.length + 5;
            const opacity = properties.opacity === undefined ? 255 : Number(properties.opacity);
            template[propertyOffset] = properties.visible === false ? 0 : 1;
            template[propertyOffset + 1] = properties.isBackground ? 1 : 0;
            template[propertyOffset + 2] = Math.max(0, Math.min(255, opacity));
            const blendMode = LayerProperties.getBlendMode(properties.blendMode).pdnValue;
            const blendModeValueOffset = this.findBlendModeValueOffset(template, propertyOffset + 3);
            new DataView(template.buffer, template.byteOffset + blendModeValueOffset, 4)
                .setInt32(0, blendMode, true);

            const name = encoder.encode(properties.name || "Layer " + (index + 1));
            replacements.push({
                start: markerOffset - 1,
                end: markerOffset + marker.length,
                bytes: this.concat([this.encode7BitInt(name.length), name])
            });
        }

        replacements.sort((left, right) => right.start - left.start);
        let result = template;
        for (const replacement of replacements) {
            result = this.concat([
                result.subarray(0, replacement.start),
                replacement.bytes,
                result.subarray(replacement.end)
            ]);
        }
        return result;
    }

    static readLayerCountFromHeader(header) {
        const xml = new TextDecoder().decode(header);
        const match = xml.match(/\blayers="(\d+)"/);
        return match === null ? 0 : Number(match[1]);
    }

    static async repairLegacyBlendModeRecords(graph, layerCount) {
        if (!Number.isInteger(layerCount) || layerCount < 1 || layerCount > 64) return null;

        const response = await fetch("assets/pdn/templates/" + layerCount + ".bin");
        if (!response.ok) return null;
        const template = new Uint8Array(await response.arrayBuffer());
        const repaired = graph.slice();
        const encoder = new TextEncoder();
        const repairedOffsets = [];

        for (let index = 0; index < layerCount; ++index) {
            const marker = encoder.encode("PDJ_LAYER_" + String(index).padStart(4, "0"));
            const markerOffset = this.findByteSequence(template, marker);
            if (markerOffset < 6 || template[markerOffset - 6] !== 6) return null;

            // BinaryObjectString + object id uniquely identifies the layer-name
            // record even after the placeholder has been replaced by any name.
            const nameRecordSignature = template.subarray(markerOffset - 6, markerOffset - 1);
            const nameRecordOffset = this.findByteSequence(repaired, nameRecordSignature);
            if (nameRecordOffset < 0) return null;

            const nameEnd = this.skipLengthPrefixedString(repaired, nameRecordOffset + 5);
            const propertyOffset = nameEnd + 5; // MemberReference for metadata items.
            const recordOffset = propertyOffset + 3; // visible, background, opacity.
            if (recordOffset + 4 > repaired.length) return null;

            const brokenBlendMode = new DataView(
                repaired.buffer,
                repaired.byteOffset + recordOffset,
                4
            ).getInt32(0, true);
            if (brokenBlendMode < 0 || brokenBlendMode > 13) return null;

            const templatePropertyOffset = markerOffset + marker.length + 5;
            const templateRecordOffset = templatePropertyOffset + 3;
            repaired.set(template.subarray(templateRecordOffset, templateRecordOffset + 4), recordOffset);

            const valueOffset = this.findBlendModeValueOffset(repaired, recordOffset);
            new DataView(repaired.buffer, repaired.byteOffset + valueOffset, 4)
                .setInt32(0, brokenBlendMode, true);
            repairedOffsets.push(recordOffset);
        }

        return repairedOffsets.length === layerCount ? repaired : null;
    }

    static findBlendModeValueOffset(bytes, recordOffset) {
        const recordType = bytes[recordOffset];
        if (recordType === 1) {
            // ClassWithId: tag, object id, metadata id, then the Int32 enum value.
            return recordOffset + 9;
        }
        if (recordType !== 5) {
            throw new Error("Unsupported Paint.NET blend mode record");
        }

        // ClassWithMembersAndTypes. Walk its class metadata to the first (and
        // only) member value instead of relying on template-specific offsets.
        let offset = recordOffset + 5; // Tag and object id.
        offset = this.skipLengthPrefixedString(bytes, offset);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const memberCount = view.getInt32(offset, true);
        offset += 4;
        if (memberCount !== 1) throw new Error("Invalid Paint.NET blend mode enum");

        for (let index = 0; index < memberCount; ++index) {
            offset = this.skipLengthPrefixedString(bytes, offset);
        }
        const binaryTypes = bytes.subarray(offset, offset + memberCount);
        offset += memberCount;
        for (const binaryType of binaryTypes) {
            if (binaryType === 0 || binaryType === 7) {
                ++offset; // PrimitiveTypeEnumeration.
            } else if (binaryType === 3) {
                offset = this.skipLengthPrefixedString(bytes, offset);
            } else if (binaryType === 4) {
                offset = this.skipLengthPrefixedString(bytes, offset) + 4;
            }
        }
        offset += 4; // Library id.
        return offset;
    }

    static skipLengthPrefixedString(bytes, offset) {
        let length = 0;
        let shift = 0;
        for (let index = 0; index < 5; ++index) {
            if (offset >= bytes.length) throw new Error("Truncated NRBF string");
            const value = bytes[offset++];
            length |= (value & 0x7f) << shift;
            if ((value & 0x80) === 0) {
                const end = offset + length;
                if (end > bytes.length) throw new Error("Truncated NRBF string");
                return end;
            }
            shift += 7;
        }
        throw new Error("Invalid NRBF string length");
    }

    static async encodeSurface(canvas) {
        const rgba = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        const bgra = new Uint8Array(rgba.length);
        for (let offset = 0; offset < rgba.length; offset += 4) {
            bgra[offset] = rgba[offset + 2];
            bgra[offset + 1] = rgba[offset + 1];
            bgra[offset + 2] = rgba[offset];
            bgra[offset + 3] = rgba[offset + 3];
        }

        const chunkHeader = new Uint8Array(5);
        chunkHeader[0] = 0; // GZip compression.
        this.writeUint32BE(chunkHeader, 1, this.PIXEL_CHUNK_SIZE);
        const parts = [chunkHeader];

        for (let chunk = 0, offset = 0; offset < bgra.length; ++chunk, offset += this.PIXEL_CHUNK_SIZE) {
            const end = Math.min(bgra.length, offset + this.PIXEL_CHUNK_SIZE);
            const compressed = await this.gzip(bgra.subarray(offset, end));
            const header = new Uint8Array(8);
            this.writeUint32BE(header, 0, chunk);
            this.writeUint32BE(header, 4, compressed.length);
            parts.push(header, compressed);
        }

        return this.concat(parts);
    }

    static async gzip(bytes) {
        if (typeof CompressionStream === "undefined") {
            throw new Error("This browser does not support native .pdn compression");
        }
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    static async gunzip(bytes) {
        if (typeof DecompressionStream === "undefined") {
            throw new Error("This browser does not support native .pdn decompression");
        }
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    static replaceUint32(bytes, oldValue, newValue) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let count = 0;
        for (let offset = 0; offset + 4 <= bytes.length; ++offset) {
            if (view.getUint32(offset, true) !== oldValue) continue;
            view.setUint32(offset, newValue, true);
            ++count;
            offset += 3;
        }
        return count;
    }

    static replaceUint64(bytes, oldValue, newValue) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let count = 0;
        for (let offset = 0; offset + 8 <= bytes.length; ++offset) {
            if (view.getBigUint64(offset, true) !== oldValue) continue;
            view.setBigUint64(offset, newValue, true);
            ++count;
            offset += 7;
        }
        return count;
    }

    static findByteSequence(bytes, sequence) {
        outer: for (let offset = 0; offset + sequence.length <= bytes.length; ++offset) {
            for (let index = 0; index < sequence.length; ++index) {
                if (bytes[offset + index] !== sequence[index]) continue outer;
            }
            return offset;
        }
        return -1;
    }

    static encode7BitInt(value) {
        const bytes = [];
        do {
            let next = value & 0x7f;
            value >>>= 7;
            if (value !== 0) next |= 0x80;
            bytes.push(next);
        } while (value !== 0);
        return new Uint8Array(bytes);
    }

    static readUint32BE(bytes, offset) {
        return ((bytes[offset] << 24) | (bytes[offset + 1] << 16)
            | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    }

    static writeUint32BE(bytes, offset, value) {
        bytes[offset] = (value >>> 24) & 255;
        bytes[offset + 1] = (value >>> 16) & 255;
        bytes[offset + 2] = (value >>> 8) & 255;
        bytes[offset + 3] = value & 255;
    }

    static concat(parts) {
        const length = parts.reduce((total, part) => total + part.length, 0);
        const result = new Uint8Array(length);
        let offset = 0;
        for (const part of parts) {
            result.set(part, offset);
            offset += part.length;
        }
        return result;
    }
}
