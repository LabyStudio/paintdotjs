class ShapeCatalog {

    static CUSTOM_GROUP = {
        label: "Custom",
        values: [
            "club", "spade", "doubleArrow", "circularArrow", "stripedArrow", "curvedArrow", "burst", "scroll",
            "funnel", "cone", "cube", "cylinder", "verticalBlock", "pyramid", "dome", "bowl",
            "compassStar", "frame", "document", "folder", "envelope", "openEnvelope", "stackedCards", "laptop",
            "phone", "pushPin", "globe", "house", "target", "roundedTriangle", "smallLightning", "seal",
            "shoe", "motorcycle", "train", "suv", "cart", "truck", "bus", "car",
            "rocket", "tram", "printer", "key", "lock", "unlock", "person", "people",
            "inbox", "user", "diagonalSquare", "splitLeft", "splitRight", "wedge", "ring", "sun", "circle"
        ]
    };

    static LABELS = {
        club: "Club", spade: "Spade", doubleArrow: "Double-headed arrow",
        circularArrow: "Circular arrow", stripedArrow: "Striped arrow", curvedArrow: "Curved arrow",
        burst: "Explosion", scroll: "Scroll", funnel: "Funnel", cone: "Cone", cube: "Cube",
        cylinder: "Cylinder", verticalBlock: "Vertical block", pyramid: "Pyramid", dome: "Dome", bowl: "Bowl",
        compassStar: "Compass star", frame: "Frame", document: "Document", folder: "Folder",
        envelope: "Envelope", openEnvelope: "Open envelope", stackedCards: "Stacked cards", laptop: "Laptop",
        phone: "Phone", pushPin: "Push pin", globe: "Globe", house: "House", target: "Target",
        roundedTriangle: "Rounded triangle", smallLightning: "Lightning", seal: "Seal",
        shoe: "Shoe", motorcycle: "Motorcycle", train: "Train", suv: "SUV", cart: "Shopping cart",
        truck: "Truck", bus: "Bus", car: "Car", rocket: "Rocket", tram: "Tram", printer: "Printer",
        key: "Key", lock: "Locked", unlock: "Unlocked", person: "Person", people: "People",
        inbox: "Inbox", user: "User", diagonalSquare: "Diagonal square", splitLeft: "Left split",
        splitRight: "Right split", wedge: "Wedge", ring: "Ring", sun: "Sun", circle: "Circle"
    };

    // These paths use a common 32 x 32 view box. They intentionally stay
    // compact: the same geometry powers both the picker previews and canvas
    // rendering, so the menu never advertises a shape that cannot be drawn.
    static PATHS = {
        club: "M16 3c-5 0-7 6-3 9-7-3-10 7-4 10-6 1-4 10 3 8l-4 2h14l-4-2c7 2 9-7 3-8 6-3 3-13-4-10 4-3 2-9-3-9Z",
        spade: "M16 2C13 8 4 11 4 19c0 6 7 8 11 4-1 4-3 6-5 7h12c-2-1-4-3-5-7 4 4 11 2 11-4 0-8-9-11-12-17Z",
        doubleArrow: "M2 16 9 9v4h14V9l7 7-7 7v-4H9v4Z",
        circularArrow: "M25 8V2l6 7-6 7v-5c-7-6-18-1-17 9l-5 2C0 8 15 0 25 8Zm-18 8v5c7 6 18 1 17-9l5-2c3 14-12 22-22 14v6l-6-7Z",
        stripedArrow: "M2 11h15V6l13 10-13 10v-5H2v-3h18l3-2-3-2H2Z",
        curvedArrow: "M3 26c1-13 8-18 18-18V3l10 8-10 8v-5C13 14 8 18 7 27Z",
        burst: "M16 1l3 7 6-5-1 8 7-1-5 6 5 5-8 1 2 8-6-5-3 8-2-8-7 5 2-8-8-1 6-6-6-4 8-2-3-7 7 3Z",
        scroll: "M3 8h21c4 0 6 3 6 6s-2 6-6 6H9v5l-7-9 7-9v5h15c1 0 2 1 2 2s-1 2-2 2H3Z",
        funnel: "M3 4h26L19 17v10l-6 3V17Z",
        cone: "M16 3 29 27H3Zm0 0c4 0 7 2 7 4s-3 4-7 4-7-2-7-4 3-4 7-4Z",
        cube: "m16 2 13 7v15l-13 7L3 24V9Zm0 4L8 10l8 4 8-4Zm-9 7v9l7 4V17Zm18 0-7 4v9l7-4Z",
        cylinder: "M5 7c0-6 22-6 22 0v18c0 6-22 6-22 0Zm0 0c0 6 22 6 22 0m0 18c0-6-22-6-22 0",
        verticalBlock: "M8 3h16v26H8Zm4 4h8v18h-8Z",
        pyramid: "M16 2 30 27H2Zm0 0v25m0-25L7 27m9-25 9 25",
        dome: "M3 25c1-14 7-21 13-21s12 7 13 21Zm0 0h26v4H3Z",
        bowl: "M3 8h26c-1 13-6 20-13 20S4 21 3 8Zm2 0c4 5 18 5 22 0",
        compassStar: "m16 1 3 11 11 4-11 3-3 12-3-12-12-3 12-4Zm0 7v16m-8-8h16",
        frame: "M3 4h26v24H3Zm5 5v14h16V9Z",
        document: "M7 2h13l6 6v22H7Zm13 0v7h6M11 14h11m-11 5h11m-11 5h8",
        folder: "M2 7h11l3 4h14v17H2Zm0 4h28",
        envelope: "M2 6h28v21H2Zm1 2 13 11L29 8M3 25l9-9m17 9-9-9",
        openEnvelope: "M2 12 16 3l14 9v17H2Zm0 0 14 11 14-11M2 28l10-9m18 9-10-9",
        stackedCards: "M3 7h21v17H3Zm5-4h21v17h-5M8 11h21v17H8Z",
        laptop: "M7 4h18v17H7Zm-5 20h28l-3 5H5Z",
        phone: "M10 2h12c2 0 3 1 3 3v22c0 2-1 3-3 3H10c-2 0-3-1-3-3V5c0-2 1-3 3-3Zm-1 5h14v17H9Zm5 20h4",
        pushPin: "M11 3h10l-2 8 5 5v3H18l-2 12-2-12H8v-3l5-5Z",
        globe: "M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm0 0c-8 7-8 21 0 28m0-28c8 7 8 21 0 28M3 16h26M6 9h20M6 23h20",
        house: "M2 15 16 3l14 12-4 1v14H6V16Zm9 15V20h10v10",
        target: "M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm0 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        roundedTriangle: "M16 3c1 0 2 1 3 3l10 18c2 4-1 6-4 6H7c-4 0-6-3-4-6L13 6c1-2 2-3 3-3Z",
        smallLightning: "M18 2 5 18h9l-2 12 15-18h-9Z",
        seal: "m16 1 4 4 5-1 2 5 5 3-2 5 2 5-5 3-2 5-5-1-4 4-4-4-5 1-2-5-5-3 2-5-2-5 5-3 2-5 5 1Z",
        shoe: "M3 19c5 0 8-4 9-11l7 5c3 3 7 5 11 6v8H3Z",
        motorcycle: "M7 18a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm19 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM7 23h8l5-9h6m-11 9-5-12h7l5 12",
        train: "M5 4h22v20H5Zm4 3h14v8H9Zm0 17-4 6m18-6 4 6M5 20h22",
        suv: "M3 13h4l4-6h10l5 6h3v11H3Zm7 0h12l-3-4h-7ZM8 22a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm16 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        cart: "M3 4h4l3 16h15l4-11H9m3 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        truck: "M2 9h18v15H2Zm18 6h6l4 5v4H20ZM7 22a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm18 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        bus: "M3 4h26v22H3Zm4 3h18v9H7ZM8 23a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm16 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        car: "M3 15h4l4-6h11l5 6h3v10H3Zm6 0h15l-4-4h-7ZM8 23a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm17 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        rocket: "M16 2c7 5 8 14 4 21l-4 6-4-6C8 16 9 7 16 2Zm0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM11 18l-6 4v7l8-5m8-6 6 4v7l-8-5",
        tram: "M5 6h22v19H5Zm4 3h14v8H9ZM8 25l-3 5m19-5 3 5M11 6l5-4 5 4",
        printer: "M7 3h18v8H7ZM3 10h26v14h-5v5H8v-5H3Zm7 10h12v7H10Z",
        key: "M4 20a7 7 0 1 1 12-5l15-15 3 3-3 3 2 2-4 4-2-2-3 3-2-2-6 6a7 7 0 0 1-12 3Zm6-3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
        lock: "M7 14h18v16H7Zm4 0V9a5 5 0 0 1 10 0v5m-5 5v6",
        unlock: "M7 14h18v16H7Zm4 0V9a5 5 0 0 1 10 0m-5 10v6",
        person: "M16 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM5 30c1-9 5-13 11-13s10 4 11 13Z",
        people: "M11 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm10 2a4 4 0 1 1 0 8M2 29c1-8 4-12 9-12s8 4 9 12Zm17-10c6 0 9 3 10 10h-7",
        inbox: "M4 3h24v26H4Zm0 18h7l3 4h4l3-4h7",
        user: "M16 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM4 30c1-9 5-13 12-13s11 4 12 13",
        diagonalSquare: "M3 3h26v26H3Zm0 26L29 3",
        splitLeft: "M3 3h26v26H3Zm13 0v26L3 16Z",
        splitRight: "M3 3h26v26H3Zm13 0v26l13-13Z",
        wedge: "M3 29h26V3Z",
        ring: "M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm0 6a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z",
        sun: "M16 7a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0-6v4m0 22v4M1 16h4m22 0h4M5 5l3 3m16 16 3 3M27 5l-3 3M8 24l-3 3",
        circle: "M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Z"
    };

    static has(shape) {
        return Object.hasOwn(ShapeCatalog.PATHS, shape);
    }

    static getEntries() {
        return ShapeCatalog.CUSTOM_GROUP.values.map(value => [value, ShapeCatalog.LABELS[value]]);
    }

    static getIconSource(shape) {
        const path = ShapeCatalog.PATHS[shape];
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
            + '<path d="' + path + '" fill="#4f86b8" stroke="#b9dcff" stroke-width="1.6" '
            + 'stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd"/></svg>';
        return "data:image/svg+xml," + encodeURIComponent(svg);
    }

    static createPath(shape, rect) {
        if (!ShapeCatalog.has(shape) || typeof Path2D === "undefined" || typeof DOMMatrix === "undefined") {
            return null;
        }
        const path = new Path2D();
        const source = new Path2D(ShapeCatalog.PATHS[shape]);
        const matrix = new DOMMatrix([
            rect.width / 32, 0,
            0, rect.height / 32,
            rect.x, rect.y
        ]);
        path.addPath(source, matrix);
        return path;
    }
}
