var GPC;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./dist/AetTree.js":
/*!*************************!*\
  !*** ./dist/AetTree.js ***!
  \*************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AetTree = void 0;
class AetTree {
    constructor() {
        this.top = null;
    }
    addEdge(edge) {
        if (this.top === null) {
            /* Append edge onto the tail end of the AET */
            this.top = edge;
            edge.prev = null;
            edge.next = null;
            return;
        }
        let prevEdge = null;
        let currentEdge = this.top;
        while (true) {
            /* Do primary sort on the xb field, and secondary sort on the dx field. */
            if (edge.xb < currentEdge.xb || (edge.xb === currentEdge.xb && edge.dx < currentEdge.dx)) {
                /* Insert edge here (before the AET edge) */
                edge.prev = prevEdge;
                edge.next = currentEdge;
                currentEdge.prev = edge;
                if (prevEdge === null) {
                    this.top = edge;
                }
                else {
                    prevEdge.next = edge;
                }
                return;
            }
            /* Head further into the AET */
            prevEdge = currentEdge;
            if (currentEdge.next === null) {
                currentEdge.next = edge;
                edge.prev = currentEdge;
                edge.next = null;
                return;
            }
            else {
                currentEdge = currentEdge.next;
            }
        }
    }
}
exports.AetTree = AetTree;


/***/ }),

/***/ "./dist/Clip.js":
/*!**********************!*\
  !*** ./dist/Clip.js ***!
  \**********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.clip = void 0;
const AetTree_1 = __webpack_require__(/*! ./AetTree */ "./dist/AetTree.js");
const LmtTable_1 = __webpack_require__(/*! ./LmtTable */ "./dist/LmtTable.js");
const PolygonNode_1 = __webpack_require__(/*! ./PolygonNode */ "./dist/PolygonNode.js");
const SBTree_1 = __webpack_require__(/*! ./SBTree */ "./dist/SBTree.js");
const StNode_1 = __webpack_require__(/*! ./StNode */ "./dist/StNode.js");
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
function miniMaxTest(subject, clipper, op) {
    const sBBoxes = subject.getInnerPolies().map((ip) => ip.bounds);
    const cBBoxes = clipper.getInnerPolies().map((ip) => ip.bounds);
    /* Check all subject contour bounding boxes against clip boxes */
    const oTable = cBBoxes.map((c) => sBBoxes.map((s) => !((s.maxx < c.minx) || (s.minx > c.maxx)) &&
        !((s.maxy < c.miny) || (s.miny > c.maxy))));
    /* For each clip contour, search for any subject contour overlaps */
    const clipNumPoly = cBBoxes.length;
    for (let c = 0; c < clipNumPoly; c++) {
        const overlap = oTable[c].every((s) => s);
        if (!overlap) {
            clipper[util_1.setContributing](c, false); // Flag non contributing status
        }
    }
    if (op === util_1.OperationType.INT) {
        /* For each subject contour, search for any clip contour overlaps */
        const subjNumPoly = sBBoxes.length;
        for (let s = 0; s < subjNumPoly; s++) {
            const overlap = oTable.every((c) => c[s]);
            if (!overlap) {
                subject[util_1.setContributing](s, false); // Flag non contributing status
            }
        }
    }
}
function clip(op, subject, clipper, Simple, Compound) {
    const sEmpty = subject.isEmpty;
    const cEmpty = clipper.isEmpty;
    /* Test for trivial NULL result cases */
    if ((cEmpty && op === util_1.OperationType.INT) ||
        (sEmpty && (cEmpty || op === util_1.OperationType.INT || op === util_1.OperationType.DIF))) {
        return new Simple([], false);
    }
    /* Identify potentialy contributing contours */
    if ((op === util_1.OperationType.INT || op === util_1.OperationType.DIF) && !(sEmpty || cEmpty)) {
        miniMaxTest(subject, clipper, op);
    }
    /* Build LMT */
    const lmtTable = new LmtTable_1.LmtTable();
    const sbte = new SBTree_1.ScanBeamTreeEntries();
    if (!sEmpty) {
        LmtTable_1.buildLmt(lmtTable, sbte, subject, util_1.SUBJ, op);
    }
    if (!cEmpty) {
        LmtTable_1.buildLmt(lmtTable, sbte, clipper, util_1.CLIP, op);
    }
    /* Return a NULL result if no contours contribute */
    if (lmtTable.top === null) {
        return new Simple([], false);
    }
    const parity = {
        /* Invert clip polygon for difference operation */
        clip: op === util_1.OperationType.DIF ? util_1.RIGHT : util_1.LEFT,
        subj: util_1.LEFT,
    };
    /* Build scanbeam table from scanbeam tree */
    const sbt = sbte.buildSBT();
    /* Used to create resulting Polygon */
    const outPoly = new PolygonNode_1.TopPolygonNode(Simple, Compound);
    const aet = new AetTree_1.AetTree();
    let scanbeam = 0;
    let localMin = lmtTable.top;
    /* Process each scanbeam */
    while (scanbeam < sbt.length) {
        /* Set yb and yt to the bottom and top of the scanbeam */
        const yb = sbt[scanbeam++];
        let yt = 0;
        let dy = 0;
        if (scanbeam < sbt.length) {
            yt = sbt[scanbeam];
            dy = yt - yb;
        }
        /* === SCANBEAM BOUNDARY PROCESSING ================================ */
        /* If LMT node corresponding to yb exists */
        if (localMin !== null) {
            if (localMin.y === yb) {
                /* Add edges starting at this local minimum to the AET */
                for (let edge = localMin.firstBound; edge !== null; edge = edge.nextBound) {
                    aet.addEdge(edge);
                }
                localMin = localMin.next;
            }
        }
        if (aet.top === null)
            throw new Error("Encountered Unexpected Null Edge");
        /* Create bundles within AET */
        let e0 = aet.top;
        let e1 = aet.top;
        /* Set up bundle fields of first edge */
        aet.top.bundle.above[aet.top.type] = (aet.top.top.y !== yb) ? 1 : 0;
        aet.top.bundle.above[1 - aet.top.type] = 0;
        aet.top.bstate.above = util_1.BundleState.UNBUNDLED;
        for (let nextEdge = aet.top.next; nextEdge !== null; nextEdge = nextEdge.next) {
            const nextType = nextEdge.type;
            const nextTypeOpposite = 1 - nextType;
            /* Set up bundle fields of next edge */
            nextEdge.bundle.above[nextType] = (nextEdge.top.y !== yb) ? 1 : 0;
            nextEdge.bundle.above[nextTypeOpposite] = 0;
            nextEdge.bstate.above = util_1.BundleState.UNBUNDLED;
            /* Bundle edges above the scanbeam boundary if they coincide */
            if (nextEdge.bundle.above[nextType] === 1) {
                if (util_1.EQ(e0.xb, nextEdge.xb) && util_1.EQ(e0.dx, nextEdge.dx) && (e0.top.y !== yb)) {
                    nextEdge.bundle.above[nextType] ^= e0.bundle.above[nextType];
                    nextEdge.bundle.above[nextTypeOpposite] = e0.bundle.above[nextTypeOpposite];
                    nextEdge.bstate.above = util_1.BundleState.BUNDLE_HEAD;
                    e0.bundle.above[util_1.CLIP] = 0;
                    e0.bundle.above[util_1.SUBJ] = 0;
                    e0.bstate.above = util_1.BundleState.BUNDLE_TAIL;
                }
                e0 = nextEdge;
            }
        }
        const horiz = { clip: util_1.HState.NH, subj: util_1.HState.NH };
        const exists = { clip: 0, subj: 0 };
        /* Set dummy previous x value */
        let px = -Number.MAX_VALUE;
        let cf = null;
        /* Process each edge at this scanbeam boundary */
        for (let edge = aet.top; edge !== null; edge = edge.next) {
            exists.clip = edge.bundle.above[util_1.CLIP] + (edge.bundle.below[util_1.CLIP] << 1);
            exists.subj = edge.bundle.above[util_1.SUBJ] + (edge.bundle.below[util_1.SUBJ] << 1);
            if ((exists.clip | exists.subj) === 0) {
                continue;
            }
            /* Set bundle side */
            edge.bside.clip = parity.clip;
            edge.bside.subj = parity.subj;
            let contributing = false;
            let br = 0;
            let bl = 0;
            let tr = 0;
            let tl = 0;
            /* Determine contributing status and quadrant occupancies */
            if ((op === util_1.OperationType.DIF) || (op === util_1.OperationType.INT)) {
                contributing = ((exists.clip !== 0) && ((parity.subj !== 0) || (horiz.subj !== 0))) ||
                    ((exists.subj !== 0) && ((parity.clip !== 0) || (horiz.clip !== 0))) ||
                    ((exists.clip !== 0) && (exists.subj !== 0) && (parity.clip === parity.subj));
                br = parity.clip & parity.subj;
                bl = (parity.clip ^ edge.bundle.above[util_1.CLIP]) & (parity.subj ^ edge.bundle.above[util_1.SUBJ]);
                tr = (parity.clip ^ (horiz.clip !== util_1.HState.NH ? 1 : 0)) & (parity.subj ^ (horiz.subj !== util_1.HState.NH ? 1 : 0));
                tl = (parity.clip ^ (horiz.clip !== util_1.HState.NH ? 1 : 0) ^ edge.bundle.below[util_1.CLIP]) &
                    (parity.subj ^ (horiz.subj !== util_1.HState.NH ? 1 : 0) ^ edge.bundle.below[util_1.SUBJ]);
            }
            else if (op === util_1.OperationType.XOR) {
                contributing = (exists.clip !== 0) || (exists.subj !== 0);
                br = parity.clip ^ parity.subj;
                bl = (parity.clip ^ edge.bundle.above[util_1.CLIP]) ^ (parity.subj ^ edge.bundle.above[util_1.SUBJ]);
                tr = parity.clip ^ (horiz.clip !== util_1.HState.NH ? 1 : 0) ^ parity.subj ^ (horiz.subj !== util_1.HState.NH ? 1 : 0);
                tl = parity.clip ^ (horiz.clip !== util_1.HState.NH ? 1 : 0) ^ edge.bundle.below[util_1.CLIP]
                    ^ parity.subj ^ (horiz.subj !== util_1.HState.NH ? 1 : 0) ^ edge.bundle.below[util_1.SUBJ];
            }
            else if (op === util_1.OperationType.ADD) {
                contributing = ((exists.clip !== 0) && (!(parity.subj !== 0) || (horiz.subj !== 0))) ||
                    ((exists.subj !== 0) && (!(parity.clip !== 0) || (horiz.clip !== 0))) ||
                    ((exists.clip !== 0) && (exists.subj !== 0) && (parity.clip === parity.subj));
                br = parity.clip | parity.subj;
                bl = (parity.clip ^ edge.bundle.above[util_1.CLIP]) | (parity.subj ^ edge.bundle.above[util_1.SUBJ]);
                tr = (parity.clip ^ (horiz.clip !== util_1.HState.NH ? 1 : 0)) | (parity.subj ^ ((horiz.subj !== util_1.HState.NH) ? 1 : 0));
                tl = (parity.clip ^ (horiz.clip !== util_1.HState.NH ? 1 : 0) ^ edge.bundle.below[util_1.CLIP]) |
                    (parity.subj ^ (horiz.subj !== util_1.HState.NH ? 1 : 0) ^ edge.bundle.below[util_1.SUBJ]);
            }
            /* Update parity */
            parity.clip ^= edge.bundle.above[util_1.CLIP];
            parity.subj ^= edge.bundle.above[util_1.SUBJ];
            /* Update horizontal state */
            if (exists.clip !== 0) {
                horiz.clip = util_1.HState.nextState[horiz.clip][((exists.clip - 1) << 1) + parity.clip];
            }
            if (exists.subj !== 0) {
                horiz.subj = util_1.HState.nextState[horiz.subj][((exists.subj - 1) << 1) + parity.subj];
            }
            if (!contributing) {
                continue;
            }
            const { xb } = edge;
            switch (util_1.getVertexType(tr, tl, br, bl)) {
                case util_1.VertexType.EMN:
                case util_1.VertexType.IMN:
                    cf = outPoly.addLocalMin(xb, yb);
                    px = xb;
                    edge.outp.above = cf;
                    break;
                case util_1.VertexType.ERI:
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    if (xb !== px) {
                        cf.addRight(xb, yb);
                        px = xb;
                    }
                    edge.outp.above = cf;
                    cf = null;
                    break;
                case util_1.VertexType.ELI:
                    cf = edge.outp.below;
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    cf.addLeft(xb, yb);
                    px = xb;
                    break;
                case util_1.VertexType.EMX:
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    if (edge.outp.below === null)
                        throw new Error("Unexpected Null Polygon");
                    if (xb !== px) {
                        cf.addLeft(xb, yb);
                        px = xb;
                    }
                    outPoly.mergeRight(cf, edge.outp.below);
                    cf = null;
                    break;
                case util_1.VertexType.ILI:
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    if (xb !== px) {
                        cf.addLeft(xb, yb);
                        px = xb;
                    }
                    edge.outp.above = cf;
                    cf = null;
                    break;
                case util_1.VertexType.IRI:
                    cf = edge.outp.below;
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    cf.addRight(xb, yb);
                    px = xb;
                    edge.outp.below = null;
                    break;
                case util_1.VertexType.IMX:
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    if (edge.outp.below === null)
                        throw new Error("Unexpected Null Polygon");
                    if (xb !== px) {
                        cf.addRight(xb, yb);
                        px = xb;
                    }
                    outPoly.mergeLeft(cf, edge.outp.below);
                    cf = null;
                    edge.outp.below = null;
                    break;
                case util_1.VertexType.IMM:
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    if (edge.outp.below === null)
                        throw new Error("Unexpected Null Polygon");
                    if (xb !== px) {
                        cf.addRight(xb, yb);
                        px = xb;
                    }
                    outPoly.mergeLeft(cf, edge.outp.below);
                    edge.outp.below = null;
                    cf = outPoly.addLocalMin(xb, yb);
                    edge.outp.above = cf;
                    break;
                case util_1.VertexType.EMM:
                    if (cf === null)
                        throw new Error("Unexpected Null Polygon");
                    if (edge.outp.below === null)
                        throw new Error("Unexpected Null Polygon");
                    if (xb !== px) {
                        cf.addLeft(xb, yb);
                        px = xb;
                    }
                    outPoly.mergeRight(cf, edge.outp.below);
                    edge.outp.below = null;
                    cf = outPoly.addLocalMin(xb, yb);
                    edge.outp.above = cf;
                    break;
                case util_1.VertexType.LED:
                    if (edge.outp.below === null)
                        throw new Error("Unexpected Null Polygon");
                    if (edge.bot.y === yb) {
                        edge.outp.below.addLeft(xb, yb);
                    }
                    edge.outp.above = edge.outp.below;
                    px = xb;
                    break;
                case util_1.VertexType.RED:
                    if (edge.outp.below === null)
                        throw new Error("Unexpected Null Polygon");
                    if (edge.bot.y === yb) {
                        edge.outp.below.addRight(xb, yb);
                    }
                    edge.outp.above = edge.outp.below;
                    px = xb;
                    break;
                default:
            }
        }
        /* Delete terminating edges from the AET, otherwise compute xt */
        for (let edge = aet.top; edge !== null; edge = edge.next) {
            if (edge.top.y === yb) {
                const { prev, next } = edge;
                if (prev === null) {
                    aet.top = next;
                }
                else {
                    prev.next = next;
                }
                if (next !== null) {
                    next.prev = prev;
                }
                /* Copy bundle head state to the adjacent tail edge if required */
                if ((edge.bstate.below === util_1.BundleState.BUNDLE_HEAD) && (prev !== null)) {
                    if (prev.bstate.below === util_1.BundleState.BUNDLE_TAIL) {
                        prev.outp.below = edge.outp.below;
                        prev.bstate.below = util_1.BundleState.UNBUNDLED;
                        if (prev.prev !== null) {
                            if (prev.prev.bstate.below === util_1.BundleState.BUNDLE_TAIL) {
                                prev.bstate.below = util_1.BundleState.BUNDLE_HEAD;
                            }
                        }
                    }
                }
            }
            else {
                edge.xt = edge.top.y === yt ?
                    edge.top.x : (edge.bot.x + edge.dx * (yt - edge.bot.y));
            }
        }
        if (scanbeam >= sbte.sbtEntries) {
            continue;
        }
        /* === SCANBEAM INTERIOR PROCESSING ============================== */
        /* Build intersection table for the current scanbeam */
        const itTable = new StNode_1.ItNodeTable();
        itTable.buildIntersectionTable(aet, dy);
        /* Process each node in the intersection table */
        for (let intersect = itTable.top; intersect !== null; intersect = intersect.next) {
            [e0, e1] = intersect.ie;
            /* Only generate output for contributing intersections */
            if (((e0.bundle.above[util_1.CLIP] !== 0) || (e0.bundle.above[util_1.SUBJ] !== 0)) &&
                ((e1.bundle.above[util_1.CLIP] !== 0) || (e1.bundle.above[util_1.SUBJ] !== 0))) {
                const p = e0.outp.above;
                const q = e1.outp.above;
                const ix = intersect.point.x;
                const iy = intersect.point.y + yb;
                const inClip = (((e0.bundle.above[util_1.CLIP] !== 0) && (e0.bside.clip === 0)) ||
                    ((e1.bundle.above[util_1.CLIP] !== 0) && (e1.bside.clip !== 0)) ||
                    ((e0.bundle.above[util_1.CLIP] === 0) && (e1.bundle.above[util_1.CLIP] === 0) &&
                        ((e0.bside.clip & e1.bside.clip) === 1))) ? 1 : 0;
                const inSubj = (((e0.bundle.above[util_1.SUBJ] !== 0) && (e0.bside.subj === 0)) ||
                    ((e1.bundle.above[util_1.SUBJ] !== 0) && (e1.bside.subj !== 0)) ||
                    ((e0.bundle.above[util_1.SUBJ] === 0) && (e1.bundle.above[util_1.SUBJ] === 0) &&
                        ((e0.bside.subj & e1.bside.subj) === 1))) ? 1 : 0;
                let tr = 0;
                let tl = 0;
                let br = 0;
                let bl = 0;
                /* Determine quadrant occupancies */
                if ((op === util_1.OperationType.DIF) || (op === util_1.OperationType.INT)) {
                    tr = inClip & inSubj;
                    tl = (inClip ^ e1.bundle.above[util_1.CLIP]) & (inSubj ^ e1.bundle.above[util_1.SUBJ]);
                    br = (inClip ^ e0.bundle.above[util_1.CLIP]) & (inSubj ^ e0.bundle.above[util_1.SUBJ]);
                    bl = (inClip ^ e1.bundle.above[util_1.CLIP] ^ e0.bundle.above[util_1.CLIP]) & (inSubj ^ e1.bundle.above[util_1.SUBJ] ^ e0.bundle.above[util_1.SUBJ]);
                }
                else if (op === util_1.OperationType.XOR) {
                    tr = inClip ^ inSubj;
                    tl = (inClip ^ e1.bundle.above[util_1.CLIP]) ^ (inSubj ^ e1.bundle.above[util_1.SUBJ]);
                    br = (inClip ^ e0.bundle.above[util_1.CLIP]) ^ (inSubj ^ e0.bundle.above[util_1.SUBJ]);
                    bl = (inClip ^ e1.bundle.above[util_1.CLIP] ^ e0.bundle.above[util_1.CLIP])
                        ^ (inSubj ^ e1.bundle.above[util_1.SUBJ] ^ e0.bundle.above[util_1.SUBJ]);
                }
                else if (op === util_1.OperationType.ADD) {
                    tr = inClip | inSubj;
                    tl = (inClip ^ e1.bundle.above[util_1.CLIP]) | (inSubj ^ e1.bundle.above[util_1.SUBJ]);
                    br = (inClip ^ e0.bundle.above[util_1.CLIP]) | (inSubj ^ e0.bundle.above[util_1.SUBJ]);
                    bl = (inClip ^ e1.bundle.above[util_1.CLIP] ^ e0.bundle.above[util_1.CLIP]) | (inSubj ^ e1.bundle.above[util_1.SUBJ] ^ e0.bundle.above[util_1.SUBJ]);
                }
                switch (util_1.getVertexType(tr, tl, br, bl)) {
                    case util_1.VertexType.EMN:
                        e0.outp.above = outPoly.addLocalMin(ix, iy);
                        e1.outp.above = e0.outp.above;
                        break;
                    case util_1.VertexType.ERI:
                        if (p !== null) {
                            p.addRight(ix, iy);
                            e1.outp.above = p;
                            e0.outp.above = null;
                        }
                        break;
                    case util_1.VertexType.ELI:
                        if (q !== null) {
                            q.addLeft(ix, iy);
                            e0.outp.above = q;
                            e1.outp.above = null;
                        }
                        break;
                    case util_1.VertexType.EMX:
                        if ((p !== null) && (q !== null)) {
                            p.addLeft(ix, iy);
                            outPoly.mergeRight(p, q);
                            e0.outp.above = null;
                            e1.outp.above = null;
                        }
                        break;
                    case util_1.VertexType.IMN:
                        e0.outp.above = outPoly.addLocalMin(ix, iy);
                        e1.outp.above = e0.outp.above;
                        break;
                    case util_1.VertexType.ILI:
                        if (p !== null) {
                            p.addLeft(ix, iy);
                            e1.outp.above = p;
                            e0.outp.above = null;
                        }
                        break;
                    case util_1.VertexType.IRI:
                        if (q !== null) {
                            q.addRight(ix, iy);
                            e0.outp.above = q;
                            e1.outp.above = null;
                        }
                        break;
                    case util_1.VertexType.IMX:
                        if ((p !== null) && (q !== null)) {
                            p.addRight(ix, iy);
                            outPoly.mergeLeft(p, q);
                            e0.outp.above = null;
                            e1.outp.above = null;
                        }
                        break;
                    case util_1.VertexType.IMM:
                        if ((p !== null) && (q !== null)) {
                            p.addRight(ix, iy);
                            outPoly.mergeLeft(p, q);
                            e0.outp.above = outPoly.addLocalMin(ix, iy);
                            e1.outp.above = e0.outp.above;
                        }
                        break;
                    case util_1.VertexType.EMM:
                        if ((p !== null) && (q !== null)) {
                            p.addLeft(ix, iy);
                            outPoly.mergeRight(p, q);
                            e0.outp.above = outPoly.addLocalMin(ix, iy);
                            e1.outp.above = e0.outp.above;
                        }
                        break;
                    default:
                }
            }
            /* Swap bundle sides in response to edge crossing */
            if (e0.bundle.above[util_1.CLIP] !== 0) {
                e1.bside.clip = 1 - e1.bside.clip;
            }
            if (e1.bundle.above[util_1.CLIP] !== 0) {
                e0.bside.clip = 1 - e0.bside.clip;
            }
            if (e0.bundle.above[util_1.SUBJ] !== 0) {
                e1.bside.subj = 1 - e1.bside.subj;
            }
            if (e1.bundle.above[util_1.SUBJ] !== 0) {
                e0.bside.subj = 1 - e0.bside.subj;
            }
            /* Swap e0 and e1 bundles in the AET */
            let { prev } = e0;
            const { next } = e1;
            if (next !== null) {
                next.prev = e0;
            }
            if (e0.bstate.above === util_1.BundleState.BUNDLE_HEAD) {
                while (prev !== null && prev.bstate.above === util_1.BundleState.BUNDLE_TAIL) {
                    prev = prev.prev;
                }
            }
            if (aet.top === null)
                throw new Error("Encountered Unexpected Null Edge");
            if (prev === null) {
                aet.top.prev = e1;
                e1.next = aet.top;
                aet.top = e0.next;
            }
            else {
                if (prev.next === null)
                    throw new Error("Encountered Unexpected Null Edge");
                prev.next.prev = e1;
                e1.next = prev.next;
                prev.next = e0.next;
            }
            if (e0.next === null)
                throw new Error("Encountered Unexpected Null Edge");
            e0.next.prev = prev;
            e1.next.prev = e1;
            e0.next = next;
        }
        /* Prepare for next scanbeam */
        for (let edge = aet.top; edge !== null; edge = edge.next) {
            const { next, succ } = edge;
            if ((edge.top.y === yt) && (succ !== null)) {
                /* Replace AET edge by its successor */
                succ.outp.below = edge.outp.above;
                succ.bstate.below = edge.bstate.above;
                succ.bundle.below[util_1.CLIP] = edge.bundle.above[util_1.CLIP];
                succ.bundle.below[util_1.SUBJ] = edge.bundle.above[util_1.SUBJ];
                const { prev } = edge;
                if (prev !== null) {
                    prev.next = succ;
                }
                else {
                    aet.top = succ;
                }
                if (next !== null) {
                    next.prev = succ;
                }
                succ.prev = prev;
                succ.next = next;
            }
            else {
                /* Update this edge */
                edge.outp.below = edge.outp.above;
                edge.bstate.below = edge.bstate.above;
                edge.bundle.below[util_1.CLIP] = edge.bundle.above[util_1.CLIP];
                edge.bundle.below[util_1.SUBJ] = edge.bundle.above[util_1.SUBJ];
                edge.xb = edge.xt;
            }
            edge.outp.above = null;
        }
    }
    return outPoly.getResult();
}
exports.clip = clip;


/***/ }),

/***/ "./dist/Conditioning.js":
/*!******************************!*\
  !*** ./dist/Conditioning.js ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isSimple = exports.isConvex = exports.forceWinding = exports.rotateBottomLeft = void 0;
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
function findBottomLeft(points) {
    const n = points.length;
    let { x: px, y: py } = points[0];
    let min = 0;
    for (let i = 1; i < n; i++) {
        const { x, y } = points[i];
        if ((y < py) || ((py == y) && (x < px))) {
            py = y;
            px = x;
            min = i;
        }
    }
    return min;
}
function rotate(idx, points) {
    const r = points.slice(idx);
    for (let i = 0; i < idx; i++) {
        r.push(points[i]);
    }
    return r;
}
function rotateBottomLeft(points) {
    const idx = findBottomLeft(points);
    if (idx === 0) {
        return points;
    }
    return rotate(idx, points);
}
exports.rotateBottomLeft = rotateBottomLeft;
function forceWinding(dir, points) {
    const a = dir * util_1.polygonArea(points);
    if (a >= 0) {
        return dir * a;
    }
    const n = points.length;
    for (let i = 1, j = n - 1; i < j; i++, j--) {
        const t = points[i];
        points[i] = points[j];
        points[j] = t;
    }
    return dir * Math.abs(a);
}
exports.forceWinding = forceWinding;
const TWO_PI = 2 * Math.PI;
function isConvex(points) {
    const n = points.length;
    if (n <= 3) {
        return true;
    }
    let { x: ox, y: oy } = points[n - 2];
    let { x: nx, y: ny } = points[n - 1];
    let odir = 0;
    let ndir = Math.atan2(ny - oy, nx - ox);
    let angle_sum = 0;
    let orientation = 0;
    for (let i = 0; i < n; i++) {
        const p = points[i];
        ox = nx;
        oy = ny;
        odir = ndir;
        nx = p.x;
        ny = p.y;
        ndir = Math.atan2(ny - oy, nx - ox);
        let angle = ndir - odir;
        // shift to the half-open interval (-Pi, Pi]
        if (angle <= -Math.PI) {
            angle += TWO_PI;
        }
        else if (angle > Math.PI) {
            angle -= TWO_PI;
        }
        if (orientation === 0) {
            orientation = angle;
        }
        else if (orientation * angle < 0) {
            return false;
        }
        angle_sum += angle;
    }
    // Check that the total number of full turns is plus-or-minus 1
    return Math.abs(Math.round(angle_sum / TWO_PI)) === 1;
}
exports.isConvex = isConvex;
function isSimple(points) {
    const n = points.length;
    if (n <= 3) {
        return true;
    }
    let { x: ox, y: oy } = points[n - 2];
    let { x: nx, y: ny } = points[n - 1];
    let odir = 0;
    let ndir = Math.atan2(ny - oy, nx - ox);
    let angle_sum = 0;
    for (let i = 0; i < n; i++) {
        const p = points[i];
        ox = nx;
        oy = ny;
        odir = ndir;
        nx = p.x;
        ny = p.y;
        ndir = Math.atan2(ny - oy, nx - ox);
        let angle = ndir - odir;
        // shift to the half-open interval (-Pi, Pi]
        if (angle <= -Math.PI) {
            angle += TWO_PI;
        }
        else if (angle > Math.PI) {
            angle -= TWO_PI;
        }
        angle_sum += angle;
    }
    // Check that the total number of full turns is plus-or-minus 1
    return Math.abs(Math.round(angle_sum / TWO_PI)) === 1;
}
exports.isSimple = isSimple;


/***/ }),

/***/ "./dist/Contains.js":
/*!**************************!*\
  !*** ./dist/Contains.js ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.wn_poly = exports.Position = void 0;
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
// tests if a point is Left|On|Right of an infinite line.
//    Input:  three points P0, P1, and P2
//    Return: >0 for P2 left of the line through P0 and P1
//            =0 for P2  on the line
//            <0 for P2  right of the line
function testLine(P0, P1, P2) {
    const res = (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y);
    if (Math.abs(res) < util_1.EPSILON) {
        return 0;
    }
    return Math.sign(res);
}
var Position;
(function (Position) {
    Position[Position["INSIDE"] = 1] = "INSIDE";
    Position[Position["OUTSIDE"] = -1] = "OUTSIDE";
    Position[Position["BOUNDARY"] = 0] = "BOUNDARY";
})(Position = exports.Position || (exports.Position = {}));
// Dan Sunday's winding number algorithm
function wn_poly(P, V) {
    let wn = 0; // the  winding number counter
    const n = V.length - 1;
    // loop through all edges of the polygon
    for (let i = 0; i < n; i++) { // edge from V[i] to  V[i+1]
        if (V[i].y <= P.y) { // start y <= P.y
            if (V[i + 1].y > P.y) { // an upward crossing
                const t = testLine(V[i], V[i + 1], P);
                if (t === 0) {
                    return Position.BOUNDARY;
                }
                if (t > 0) { // P left of  edge
                    ++wn; // have a valid up intersect
                }
            }
        }
        else { // start y > P.y (no test needed)
            if (V[i + 1].y <= P.y) { // a downward crossing
                const t = testLine(V[i], V[i + 1], P);
                if (t === 0) {
                    return Position.BOUNDARY;
                }
                if (t < 0) { // P right of  edge
                    --wn; // have a valid down intersect
                }
            }
        }
    }
    return wn === 0 ? Position.OUTSIDE : Position.INSIDE;
}
exports.wn_poly = wn_poly;


/***/ }),

/***/ "./dist/CountorPass.js":
/*!*****************************!*\
  !*** ./dist/CountorPass.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.contourPass = void 0;
const LmtTable_1 = __webpack_require__(/*! ./LmtTable */ "./dist/LmtTable.js");
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
function boundList(lmtTable, y) {
    if (lmtTable.top === null) {
        lmtTable.top = new LmtTable_1.LmtNode(y);
        return lmtTable.top;
    }
    let prev = null;
    let node = lmtTable.top;
    while (true) {
        if (y > node.y) {
            /* Head further up the LMT */
            if (node.next === null) {
                node.next = new LmtTable_1.LmtNode(y);
                return node.next;
            }
            else {
                [prev, node] = [node, node.next];
            }
        }
        else {
            if (y < node.y) {
                /* Insert a new LMT node before the current node */
                node = new LmtTable_1.LmtNode(y, node);
                if (prev === null) {
                    lmtTable.top = node;
                }
                else {
                    prev.next = node;
                }
            }
            /* Use this existing LMT node */
            return node;
        }
    }
}
function insertBound(lmtNode, e) {
    if (lmtNode.firstBound === null) {
        /* Link node e to the tail of the list */
        lmtNode.firstBound = e;
        return;
    }
    let prevBound = null;
    let currentBound = lmtNode.firstBound;
    while (true) {
        /* Do primary sort on the x field and secondary sort on the dx field. */
        if (e.bot.x < currentBound.bot.x || (e.bot.x === currentBound.bot.x && e.dx < currentBound.dx)) {
            /* Insert a new node mid-list */
            if (prevBound === null) {
                lmtNode.firstBound = e;
            }
            else {
                prevBound.nextBound = e;
            }
            e.nextBound = currentBound;
            return;
        }
        /* Head further down the list */
        if (currentBound.nextBound === null) {
            currentBound.nextBound = e;
            return;
        }
        else {
            prevBound = currentBound;
            currentBound = currentBound.nextBound;
        }
    }
}
function contourPass(edgeTable, lmtTable, vertexCount, eIndex, type, op, fwd) {
    const next = fwd ? util_1.NEXT_INDEX : util_1.PREV_INDEX;
    for (let min = 0; min < vertexCount; min++) {
        /* If a forward local minimum... */
        if (fwd ? edgeTable.FWD_MIN(min) : edgeTable.REV_MIN(min)) {
            /* Search for the next local maximum... */
            let edgeCount = 1;
            let max = next(min, vertexCount);
            while (fwd ? edgeTable.NOT_FMAX(max) : edgeTable.NOT_RMAX(max)) {
                edgeCount++;
                max = next(max, vertexCount);
            }
            /* Build the next edge list */
            let v = min;
            const e = edgeTable.getNode(eIndex);
            e.bstate.below = util_1.BundleState.UNBUNDLED;
            e.bundle.below[util_1.CLIP] = 0;
            e.bundle.below[util_1.SUBJ] = 0;
            for (let i = 0; i < edgeCount; i++) {
                const ei = edgeTable.getNode(eIndex + i);
                let ev = edgeTable.getNode(v);
                ei.xb = ev.vertex.x;
                ei.bot.x = ev.vertex.x;
                ei.bot.y = ev.vertex.y;
                v = next(v, vertexCount);
                ev = edgeTable.getNode(v);
                ei.top.x = ev.vertex.x;
                ei.top.y = ev.vertex.y;
                ei.dx = (ev.vertex.x - ei.bot.x) / (ei.top.y - ei.bot.y);
                ei.type = type;
                ei.outp.above = null;
                ei.outp.below = null;
                ei.next = null;
                ei.prev = null;
                ei.succ = ((edgeCount > 1) && (i < (edgeCount - 1))) ? edgeTable.getNode(eIndex + i + 1) : null;
                ei.pred = ((edgeCount > 1) && (i > 0)) ? edgeTable.getNode(eIndex + i - 1) : null;
                ei.nextBound = null;
                ei.bside.clip = (op === util_1.OperationType.DIF) ? util_1.RIGHT : util_1.LEFT;
                ei.bside.subj = util_1.LEFT;
            }
            insertBound(boundList(lmtTable, edgeTable.getNode(min).vertex.y), e);
            eIndex += edgeCount;
        }
    }
    return eIndex;
}
exports.contourPass = contourPass;


/***/ }),

/***/ "./dist/EdgeNode.js":
/*!**************************!*\
  !*** ./dist/EdgeNode.js ***!
  \**************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EdgeNode = void 0;
class EdgeNode {
    constructor(x, y) {
        this.bot = { x: NaN, y: NaN }; /* Edge lower (x, y) coordinate      */
        this.top = { x: NaN, y: NaN }; /* Edge upper (x, y) coordinate      */
        this.xb = NaN; /* Scanbeam bottom x coordinate      */
        this.xt = NaN; /* Scanbeam top x coordinate         */
        this.dx = NaN; /* Change in x for a unit y increase */
        this.type = 0; /* Clip / subject edge flag          */
        this.prev = null; /* Previous edge in the AET          */
        this.next = null; /* Next edge in the AET              */
        this.pred = null; /* Edge connected at the lower end   */
        this.succ = null; /* Edge connected at the upper end   */
        this.nextBound = null; /* Pointer to next bound in LMT      */
        this.vertex = { x, y };
        this.bside = { clip: 0, subj: 0 };
        this.bundle = { above: [0, 0], below: [0, 0] };
        this.bstate = { above: null, below: null };
        this.outp = { above: null, below: null };
    }
}
exports.EdgeNode = EdgeNode;


/***/ }),

/***/ "./dist/EdgeTable.js":
/*!***************************!*\
  !*** ./dist/EdgeTable.js ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EdgeTable = void 0;
const EdgeNode_1 = __webpack_require__(/*! ./EdgeNode */ "./dist/EdgeNode.js");
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
class EdgeTable {
    constructor() {
        this.nodeList = [];
    }
    addNode(x, y) {
        this.nodeList.push(new EdgeNode_1.EdgeNode(x, y));
    }
    getNode(index) {
        return this.nodeList[index];
    }
    FWD_MIN(i) {
        const nodeList = this.nodeList;
        const prev = nodeList[util_1.PREV_INDEX(i, nodeList.length)];
        const next = nodeList[util_1.NEXT_INDEX(i, nodeList.length)];
        const ith = nodeList[i];
        return ((prev.vertex.y >= ith.vertex.y) &&
            (next.vertex.y > ith.vertex.y));
    }
    NOT_FMAX(i) {
        const nodeList = this.nodeList;
        const next = nodeList[util_1.NEXT_INDEX(i, nodeList.length)];
        const ith = nodeList[i];
        return next.vertex.y > ith.vertex.y;
    }
    REV_MIN(i) {
        const nodeList = this.nodeList;
        const prev = nodeList[util_1.PREV_INDEX(i, nodeList.length)];
        const next = nodeList[util_1.NEXT_INDEX(i, nodeList.length)];
        const ith = nodeList[i];
        return ((prev.vertex.y > ith.vertex.y) && (next.vertex.y >= ith.vertex.y));
    }
    NOT_RMAX(i) {
        const nodeList = this.nodeList;
        const prev = nodeList[util_1.PREV_INDEX(i, nodeList.length)];
        const ith = nodeList[i];
        return prev.vertex.y > ith.vertex.y;
    }
}
exports.EdgeTable = EdgeTable;


/***/ }),

/***/ "./dist/IPolygon.js":
/*!**************************!*\
  !*** ./dist/IPolygon.js ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OPTIMAL = void 0;
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
function OPTIMAL(p, i) {
    const { y: yi } = p.get(i);
    const numPoints = p.getNumPoints();
    return (p.get(util_1.PREV_INDEX(i, numPoints)).y !== yi) ||
        (p.get(util_1.NEXT_INDEX(i, numPoints)).y !== yi);
}
exports.OPTIMAL = OPTIMAL;


/***/ }),

/***/ "./dist/LmtTable.js":
/*!**************************!*\
  !*** ./dist/LmtTable.js ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildLmt = exports.LmtTable = exports.LmtNode = void 0;
const CountorPass_1 = __webpack_require__(/*! ./CountorPass */ "./dist/CountorPass.js");
const EdgeTable_1 = __webpack_require__(/*! ./EdgeTable */ "./dist/EdgeTable.js");
const IPolygon_1 = __webpack_require__(/*! ./IPolygon */ "./dist/IPolygon.js");
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
class LmtNode {
    constructor(y, /* Y coordinate at local minimum     */ next = null) {
        this.y = y;
        this.next = next;
        this.firstBound = null; /* Pointer to bound list             */
    }
}
exports.LmtNode = LmtNode;
class LmtTable {
    constructor() {
        this.top = null;
    }
}
exports.LmtTable = LmtTable;
function buildLmt(lmtTable, sbte, p, type, // poly type SUBJ/CLIP
op) {
    /* Create the entire input polygon edge table in one go */
    for (const ip of p.getInnerPolies()) {
        if (!ip[util_1.isContributing](0)) {
            /* Ignore the non-contributing contour */
            ip[util_1.setContributing](0, true);
        }
        else {
            /* Perform contour optimisation */
            let vertexCount = 0;
            const edgeTable = new EdgeTable_1.EdgeTable();
            const pointLen = ip.getNumPoints();
            for (let i = 0; i < pointLen; i++) {
                if (IPolygon_1.OPTIMAL(ip, i)) {
                    const { x, y } = ip.get(i);
                    edgeTable.addNode(x, y);
                    /* Record vertex in the scanbeam table */
                    sbte.addToSBTree(y);
                    vertexCount++;
                }
            }
            /* Do the contour forward pass */
            const eIndex = CountorPass_1.contourPass(edgeTable, lmtTable, vertexCount, 0, type, op, true);
            /* Do the contour reverse pass */
            CountorPass_1.contourPass(edgeTable, lmtTable, vertexCount, eIndex, type, op, false);
        }
    }
}
exports.buildLmt = buildLmt;


/***/ }),

/***/ "./dist/PolygonNode.js":
/*!*****************************!*\
  !*** ./dist/PolygonNode.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TopPolygonNode = exports.PolygonNode = void 0;
const Conditioning_1 = __webpack_require__(/*! ./Conditioning */ "./dist/Conditioning.js");
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
class PolygonNode {
    constructor(next, x, y) {
        this.active = true; /* Active flag / vertex count        */
        this.hole = false; /* Hole / external contour flag      */
        const vn = new util_1.VertexNode(x, y);
        this.left = vn;
        this.right = vn;
        this.next = next;
        this.proxy = this;
    }
    addRight(x, y) {
        const nv = new util_1.VertexNode(x, y);
        /* Add vertex nv to the right end of the polygon's vertex list */
        this.proxy.right.next = nv;
        this.proxy.right = nv;
    }
    addLeft(x, y) {
        /* Add vertex nv to the left end of the polygon's vertex list */
        this.proxy.left = new util_1.VertexNode(x, y, this.proxy.left);
    }
}
exports.PolygonNode = PolygonNode;
class TopPolygonNode {
    constructor(Simple, Compound) {
        this.Simple = Simple;
        this.Compound = Compound;
        this.top = null;
    }
    addLocalMin(x, y) {
        const n = new PolygonNode(this.top, x, y);
        this.top = n;
        return n;
    }
    mergeLeft(p, q) {
        /* Label contour as a hole */
        q.proxy.hole = true;
        if (p.proxy !== q.proxy) {
            /* Assign p's vertex list to the left end of q's list */
            p.proxy.right.next = q.proxy.left;
            q.proxy.left = p.proxy.left;
            /* Redirect any p.proxy references to q.proxy */
            const target = p.proxy;
            for (let node = this.top; node !== null; node = node.next) {
                if (node.proxy === target) {
                    node.active = false;
                    node.proxy = q.proxy;
                }
            }
        }
    }
    mergeRight(p, q) {
        /* Label contour as external */
        q.proxy.hole = false;
        if (p.proxy !== q.proxy) {
            /* Assign p's vertex list to the right end of q's list */
            q.proxy.right.next = p.proxy.left;
            q.proxy.right = p.proxy.right;
            /* Redirect any p->proxy references to q->proxy */
            const target = p.proxy;
            for (let node = this.top; node !== null; node = node.next) {
                if (node.proxy === target) {
                    node.active = false;
                    node.proxy = q.proxy;
                }
            }
        }
    }
    getContours() {
        const contours = [];
        outer: for (let polygon = this.top; polygon !== null; polygon = polygon.next) {
            if (!polygon.active) {
                continue;
            }
            /* Count the vertices in the current contour */
            let nv = 0;
            for (let vtx = polygon.proxy.left; vtx !== null; vtx = vtx.next) {
                if ((++nv) > 2) {
                    contours.push(polygon);
                    continue outer;
                }
            }
            polygon.active = false;
        }
        return contours;
    }
    getResult() {
        const contours = this.getContours();
        if (contours.length === 0) {
            return new this.Simple([], false);
        }
        const innerPolies = contours.flatMap((polyNode) => {
            const polys = [];
            const isHole = polyNode.proxy.hole;
            let vertices = [];
            for (let vtx = polyNode.proxy.left; vtx !== null; vtx = vtx.next) {
                //if (vtx.next && vert_eql(vtx, vtx.next)) { continue; }
                for (let i = vertices.length - 1; i >= 0; i--) {
                    if (util_1.vert_eql(vertices[i], vtx)) {
                        polys.push(new this.Simple(Conditioning_1.rotateBottomLeft(vertices.slice(i)), isHole));
                        vertices.length = i;
                    }
                }
                vertices.push({ x: vtx.x, y: vtx.y });
            }
            polys.push(new this.Simple(Conditioning_1.rotateBottomLeft(vertices), isHole));
            return polys;
        });
        return (innerPolies.length === 1) ? innerPolies[0] : new this.Compound(innerPolies);
    }
}
exports.TopPolygonNode = TopPolygonNode;


/***/ }),

/***/ "./dist/SBTree.js":
/*!************************!*\
  !*** ./dist/SBTree.js ***!
  \************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScanBeamTreeEntries = void 0;
class ScanBeamTree {
    constructor(y) {
        this.y = y;
        this.less = null; /* Pointer to nodes with lower y     */
        this.more = null; /* Pointer to nodes with higher y    */
    } /* Scanbeam node y value             */
}
class ScanBeamTreeEntries {
    constructor() {
        this.sbtEntries = 0;
        this.sbTree = null;
    }
    addToSBTree(y) {
        if (this.sbTree === null) {
            /* Add a new tree node here */
            this.sbTree = new ScanBeamTree(y);
            this.sbtEntries++;
            return;
        }
        let treeNode = this.sbTree;
        while (treeNode.y !== y) {
            const dir = treeNode.y > y ? "less" : "more";
            const child = treeNode[dir];
            if (child === null) {
                treeNode[dir] = new ScanBeamTree(y);
                this.sbtEntries++;
                return;
            }
            else {
                treeNode = child;
            }
        }
    }
    buildSBT() {
        if (this.sbTree === null)
            return [];
        const sbt = [];
        (function inner(entries, table, sbtNode) {
            if (sbtNode.less !== null) {
                entries = inner(entries, table, sbtNode.less);
            }
            table[entries] = sbtNode.y;
            entries++;
            if (sbtNode.more !== null) {
                entries = inner(entries, table, sbtNode.more);
            }
            return entries;
        })(0, sbt, this.sbTree);
        return sbt;
    }
}
exports.ScanBeamTreeEntries = ScanBeamTreeEntries;


/***/ }),

/***/ "./dist/StNode.js":
/*!************************!*\
  !*** ./dist/StNode.js ***!
  \************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addSTEdge = exports.ItNodeTable = exports.StNode = void 0;
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
class StNode {
    constructor(edge, prev) {
        this.edge = edge;
        this.xb = edge.xb;
        this.xt = edge.xt;
        this.dx = edge.dx;
        this.prev = prev;
    }
}
exports.StNode = StNode;
class ItNode {
    constructor(edge0, edge1, x, y, next) {
        this.ie = [edge0, edge1];
        this.point = { x, y };
        this.next = next;
    }
}
class ItNodeTable {
    constructor() {
        this.top = null;
    }
    buildIntersectionTable(aet, dy) {
        let st = null;
        /* Process each AET edge */
        for (let edge = aet.top; edge !== null; edge = edge.next) {
            if ((edge.bstate.above === util_1.BundleState.BUNDLE_HEAD) ||
                (edge.bundle.above[util_1.CLIP] !== 0) ||
                (edge.bundle.above[util_1.SUBJ] !== 0)) {
                st = addSTEdge(st, this, edge, dy);
            }
        }
    }
}
exports.ItNodeTable = ItNodeTable;
function addIntersection(itNode, edge0, edge1, x, y) {
    if (itNode === null || itNode.point.y > y) {
        /* Append a new node to the tail (itNode === null) or mid-list */
        return new ItNode(edge0, edge1, x, y, itNode);
    }
    /* Head further down the list */
    itNode.next = addIntersection(itNode.next, edge0, edge1, x, y);
    return itNode;
}
function addSTEdge(st, it, edge, dy) {
    if (st === null) {
        /* Append edge onto the tail end of the ST */
        return new StNode(edge, null);
    }
    const den = (st.xt - st.xb) - (edge.xt - edge.xb);
    /* If new edge and ST edge don't cross */
    if ((edge.xt >= st.xt) || (edge.dx === st.dx) || (Math.abs(den) <= util_1.EPSILON)) {
        /* No intersection - insert edge here (before the ST edge) */
        return new StNode(edge, st);
    }
    /* Compute intersection between new edge and ST edge */
    const r = (edge.xb - st.xb) / den;
    const x = st.xb + r * (st.xt - st.xb);
    const y = r * dy;
    /* Insert the edge pointers and the intersection point in the IT */
    it.top = addIntersection(it.top, st.edge, edge, x, y);
    /* Head further into the ST */
    st.prev = addSTEdge(st.prev, it, edge, dy);
    return st;
}
exports.addSTEdge = addSTEdge;


/***/ }),

/***/ "./dist/hull.js":
/*!**********************!*\
  !*** ./dist/hull.js ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.convexHull = exports.polygonHull = void 0;
function ccw(a, b, c) {
    return (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y);
}
// Graham scan. Assumes a simple polygon.
function polygonHull(points) {
    const n = points.length;
    // There can never be fewer than 4 vertices.
    // Assume the first point is bottom-left-most
    const p0 = points[0];
    let top = 1;
    for (let i = 2; i < n; i++) {
        // Duplicate points are pre-filtered
        // if (points[top].x === points[i].x && points[top].y === points[i].y) { continue; }
        points[++top] = points[i];
        while (top >= 2 && ccw(points[top - 2], points[top - 1], points[top]) >= 0) {
            points[top - 1] = points[top]; // delete internal point
            top--;
        }
    }
    // Fix up the join between the tail and start
    while (ccw(points[top - 1], points[top], p0) >= 0) {
        top--;
    }
    points.length = top + 1;
    return points;
}
exports.polygonHull = polygonHull;
function convexHull(points) {
    // Assume the first point is bottom-left-most and sort by angle
    const p0 = points[0];
    points.sort((a, b) => ccw(p0, a, b) || a.x - b.x);
    return polygonHull(points);
}
exports.convexHull = convexHull;


/***/ }),

/***/ "./dist/util.js":
/*!**********************!*\
  !*** ./dist/util.js ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.polygonArea = exports.Rectangle = exports.HState = exports.getVertexType = exports.VertexType = exports.NEXT_INDEX = exports.PREV_INDEX = exports.EQ = exports.OperationType = exports.setContributing = exports.isContributing = exports.SUBJ = exports.CLIP = exports.RIGHT = exports.LEFT = exports.EPSILON = exports.BundleState = exports.VertexNode = exports.vert_eql = void 0;
function vert_eql(a, b) {
    return a.x === b.x && a.y === b.y;
}
exports.vert_eql = vert_eql;
class VertexNode {
    constructor(x, y, next = null) {
        this.x = x;
        this.y = y;
        this.next = next;
    }
}
exports.VertexNode = VertexNode;
var BundleState;
(function (BundleState) {
    BundleState[BundleState["UNBUNDLED"] = 0] = "UNBUNDLED";
    BundleState[BundleState["BUNDLE_HEAD"] = 1] = "BUNDLE_HEAD";
    BundleState[BundleState["BUNDLE_TAIL"] = 2] = "BUNDLE_TAIL";
})(BundleState = exports.BundleState || (exports.BundleState = {}));
exports.EPSILON = 2.2204460492503131e-16;
exports.LEFT = 0;
exports.RIGHT = 1;
exports.CLIP = 0;
exports.SUBJ = 1;
exports.isContributing = Symbol();
exports.setContributing = Symbol();
var OperationType;
(function (OperationType) {
    OperationType[OperationType["DIF"] = 0] = "DIF";
    OperationType[OperationType["INT"] = 1] = "INT";
    OperationType[OperationType["XOR"] = 2] = "XOR";
    OperationType[OperationType["ADD"] = 3] = "ADD";
})(OperationType = exports.OperationType || (exports.OperationType = {}));
function EQ(a, b) {
    return (Math.abs(a - b) <= exports.EPSILON);
}
exports.EQ = EQ;
function PREV_INDEX(i, n) {
    return ((i - 1 + n) % n);
}
exports.PREV_INDEX = PREV_INDEX;
function NEXT_INDEX(i, n) {
    return ((i + 1) % n);
}
exports.NEXT_INDEX = NEXT_INDEX;
var VertexType;
(function (VertexType) {
    VertexType[VertexType["NUL"] = 0] = "NUL";
    VertexType[VertexType["EMX"] = 1] = "EMX";
    VertexType[VertexType["ELI"] = 2] = "ELI";
    VertexType[VertexType["TED"] = 3] = "TED";
    VertexType[VertexType["ERI"] = 4] = "ERI";
    VertexType[VertexType["RED"] = 5] = "RED";
    VertexType[VertexType["IMM"] = 6] = "IMM";
    VertexType[VertexType["IMN"] = 7] = "IMN";
    VertexType[VertexType["EMN"] = 8] = "EMN";
    VertexType[VertexType["EMM"] = 9] = "EMM";
    VertexType[VertexType["LED"] = 10] = "LED";
    VertexType[VertexType["ILI"] = 11] = "ILI";
    VertexType[VertexType["BED"] = 12] = "BED";
    VertexType[VertexType["IRI"] = 13] = "IRI";
    VertexType[VertexType["IMX"] = 14] = "IMX";
    VertexType[VertexType["FUL"] = 15] = "FUL";
})(VertexType = exports.VertexType || (exports.VertexType = {}));
function getVertexType(tr, tl, br, bl) {
    return tr + (tl << 1) + (br << 2) + (bl << 3);
}
exports.getVertexType = getVertexType;
var HState;
(function (HState) {
    HState.NH = 0; /* No horizontal edge                */
    HState.BH = 1; /* Bottom horizontal edge            */
    HState.TH = 2; /* Top horizontal edge               */
    /* Horizontal edge state transitions within scanbeam boundary */
    HState.nextState = [
        /*        ABOVE     BELOW     CROSS */
        /*        L   R     L   R     L   R */
        /* NH */ [HState.BH, HState.TH, HState.TH, HState.BH, HState.NH, HState.NH],
        /* BH */ [HState.NH, HState.NH, HState.NH, HState.NH, HState.TH, HState.TH],
        /* TH */ [HState.NH, HState.NH, HState.NH, HState.NH, HState.BH, HState.BH],
    ];
})(HState = exports.HState || (exports.HState = {}));
class Rectangle {
    constructor(minx, miny, maxx, maxy) {
        this.minx = minx;
        this.miny = miny;
        this.maxx = maxx;
        this.maxy = maxy;
    }
}
exports.Rectangle = Rectangle;
function polygonArea(points) {
    const n = points.length;
    let a = 0;
    let { x: jx, y: jy } = points[n - 1];
    for (let i = 0; i < n; i++) {
        const { x: ix, y: iy } = points[i];
        a += (jx + ix) * (jy - iy);
        jx = ix;
        jy = iy;
    }
    return a / 2;
}
exports.polygonArea = polygonArea;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*********************!*\
  !*** ./dist/gpc.js ***!
  \*********************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Polygon = void 0;
const Clip_1 = __webpack_require__(/*! ./Clip */ "./dist/Clip.js");
const Conditioning_1 = __webpack_require__(/*! ./Conditioning */ "./dist/Conditioning.js");
const Contains_1 = __webpack_require__(/*! ./Contains */ "./dist/Contains.js");
const hull_1 = __webpack_require__(/*! ./hull */ "./dist/hull.js");
const util_1 = __webpack_require__(/*! ./util */ "./dist/util.js");
class Polygon {
    toJSON() {
        return this.toVertices();
    }
    static n_ary(op, ...polys) {
        return polys.reduce((acc, p) => Clip_1.clip(op, acc, p, SimplePolygon, MultiPolygon));
    }
    static intersection(...p) {
        return Polygon.n_ary(util_1.OperationType.INT, ...p);
    }
    intersection(...p) {
        return Polygon.intersection(this, ...p);
    }
    static union(...p) {
        return Polygon.n_ary(util_1.OperationType.ADD, ...p);
    }
    union(...p) {
        return Polygon.union(this, ...p);
    }
    static xor(...p) {
        return Polygon.n_ary(util_1.OperationType.XOR, ...p);
    }
    xor(...p) {
        return Polygon.xor(this, ...p);
    }
    static difference(first, ...p) {
        switch (p.length) {
            case 0: return first;
            case 1: return Clip_1.clip(util_1.OperationType.DIF, first, p[0], SimplePolygon, MultiPolygon);
            default: {
                const clipper = p.reduce((acc, n) => Clip_1.clip(util_1.OperationType.ADD, acc, n, SimplePolygon, MultiPolygon));
                return Clip_1.clip(util_1.OperationType.DIF, first, clipper, SimplePolygon, MultiPolygon);
            }
        }
    }
    difference(...p) {
        return Polygon.difference(this, ...p);
    }
    static fromPoints(points) {
        points = points.map((p) => Array.isArray(p) ? { x: p[0] || 0, y: p[1] || 0 } : p);
        points = Conditioning_1.rotateBottomLeft(points);
        const a = Conditioning_1.forceWinding(1, points);
        const p = new SimplePolygon(points, false);
        p.area = a;
        return p;
    }
    static holeFromPoints(points) {
        points = points.map((p) => Array.isArray(p) ? { x: p[0] || 0, y: p[1] || 0 } : p);
        points = Conditioning_1.rotateBottomLeft(points);
        const a = Conditioning_1.forceWinding(-1, points);
        const p = new SimplePolygon(points, true);
        p.area = a;
        return p;
    }
    static fromVertices({ bounds, holes }) {
        return Polygon.n_ary(util_1.OperationType.ADD, ...bounds.map(Polygon.fromPoints), ...holes.map(Polygon.holeFromPoints));
    }
}
exports.Polygon = Polygon;
// A simple polygon, with only one inner polygon--itself.
class SimplePolygon extends Polygon {
    constructor(pointList, isHole) {
        super();
        this.pointList = pointList;
        this.isHole = isHole;
        this.hull = null;
        this.area = NaN;
        this.json = null;
        /** Flag used by the Clip algorithm */
        this.contributes = true;
        this._bounds = null;
    }
    equals(that) {
        if (that === this) {
            return true;
        }
        if (!(that instanceof SimplePolygon) || this.isHole !== that.isHole) {
            return false;
        }
        const { pointList: v } = this;
        const { pointList: u } = that;
        const n = v.length;
        if (n !== u.length) {
            return false;
        }
        return v.every(({ x: vx, y: vy }, i) => {
            const { x: ux, y: uy } = u[i];
            return Math.abs(vx - ux) < util_1.EPSILON && Math.abs(vy - uy) < util_1.EPSILON;
        });
    }
    get isEmpty() {
        return this.pointList.length === 0;
    }
    get bounds() {
        if (this._bounds === null) {
            let xmin = Number.MAX_VALUE;
            let ymin = Number.MAX_VALUE;
            let xmax = -Number.MAX_VALUE;
            let ymax = -Number.MAX_VALUE;
            for (const { x, y } of this.pointList) {
                if (x < xmin) {
                    xmin = x;
                }
                if (x > xmax) {
                    xmax = x;
                }
                if (y < ymin) {
                    ymin = y;
                }
                if (y > ymax) {
                    ymax = y;
                }
            }
            this._bounds = new util_1.Rectangle(xmin, ymin, xmax, ymax);
        }
        return this._bounds;
    }
    getInnerPolies() {
        return [this];
    }
    getNumPoints() {
        return this.pointList.length;
    }
    get(index) {
        return this.pointList[index];
    }
    iterVertices() {
        return this.pointList[Symbol.iterator]();
    }
    getArea() {
        if (isNaN(this.area)) {
            this.area = util_1.polygonArea(this.pointList);
        }
        return this.area;
    }
    contains(p) {
        if (p instanceof Polygon) {
            let inside = 0;
            let outside = 0;
            for (const v of p.iterVertices()) {
                const pos = Contains_1.wn_poly(v, this.pointList);
                if (pos === Contains_1.Position.INSIDE) {
                    inside++;
                }
                else if (pos === Contains_1.Position.OUTSIDE) {
                    outside++;
                }
            }
            if (inside > 0 && outside === 0) {
                return this.isHole ? Contains_1.Position.OUTSIDE : Contains_1.Position.INSIDE;
            }
            if (outside > 0 && inside === 0) {
                return this.isHole ? Contains_1.Position.INSIDE : Contains_1.Position.OUTSIDE;
            }
            return Contains_1.Position.BOUNDARY;
        }
        if (p instanceof Array) {
            p = { x: p[0], y: p[1] };
        }
        // TODO: Test with holes
        return Contains_1.wn_poly(p, this.pointList);
    }
    explode() {
        return [this];
    }
    [util_1.isContributing](polyIndex) {
        if (polyIndex !== 0) {
            throw new Error("SimplePolygon only has one poly");
        }
        return this.contributes;
    }
    [util_1.setContributing](polyIndex, contributes) {
        if (polyIndex !== 0) {
            throw new Error("SimplePolygon only has one poly");
        }
        this.contributes = contributes;
    }
    toVertices() {
        if (!this.json) {
            this.json = this.isHole ?
                { bounds: [], holes: [this.pointList] } :
                { bounds: [this.pointList], holes: [] };
        }
        return this.json;
    }
    getHull() {
        if (this.hull) {
            return this.hull;
        }
        this.hull = Conditioning_1.isConvex(this.pointList) ? this : new SimplePolygon(hull_1.polygonHull([...this.iterVertices()]), false);
        return this.hull;
    }
}
// MultiPolygon provides support for complex (with multiple disjoint cycles) and simple polygons and holes.
class MultiPolygon extends Polygon {
    constructor(polyList) {
        super();
        this.polyList = polyList;
        this.hull = null;
        this.area = NaN;
        this.explosion = null;
        this.json = null;
        this._bounds = null;
        this.polyList.sort((a, b) => {
            const ap = a.get(0);
            const bp = b.get(0);
            const t = ap.y - bp.y;
            return t === 0 ? ap.x - bp.x : t;
        });
        this.numPoints = polyList.reduce((a, n) => a + n.getNumPoints(), 0);
    }
    equals(that) {
        return (that === this) || ((that instanceof MultiPolygon) &&
            that.polyList.length === this.polyList.length &&
            this.polyList.every((p, i) => p.equals(that.polyList[i])));
    }
    get isHole() {
        return false;
    }
    get isEmpty() {
        return this.polyList.length === 0;
    }
    get bounds() {
        if (this._bounds === null) {
            const { polyList } = this;
            if (polyList.length === 0) {
                this._bounds = new util_1.Rectangle(NaN, NaN, NaN, NaN);
            }
            else if (polyList.length === 1) {
                this._bounds = this.polyList[0].bounds;
            }
            else {
                let xmin = Number.MAX_VALUE;
                let ymin = Number.MAX_VALUE;
                let xmax = -Number.MAX_VALUE;
                let ymax = -Number.MAX_VALUE;
                for (const p of this.polyList) {
                    const { maxx, maxy, minx, miny } = p.bounds;
                    if (minx < xmin) {
                        xmin = minx;
                    }
                    if (maxx > xmax) {
                        xmax = maxx;
                    }
                    if (miny < ymin) {
                        ymin = miny;
                    }
                    if (maxy > ymax) {
                        ymax = maxy;
                    }
                }
                this._bounds = new util_1.Rectangle(xmin, ymin, xmax, ymax);
            }
        }
        return this._bounds;
    }
    getInnerPolies() {
        return this.polyList;
    }
    getNumPoints() {
        return this.numPoints;
    }
    get(index) {
        for (const p of this.polyList) {
            const n = p.getNumPoints();
            if (index < n) {
                return p.get(index);
            }
            index -= n;
        }
        throw new Error("Index out of bounds");
    }
    *iterVertices() {
        for (const p of this.polyList) {
            yield* p.pointList;
        }
    }
    getArea() {
        if (isNaN(this.area)) {
            this.area = this.polyList.reduce((a, n) => a + n.getArea(), 0);
        }
        return this.area;
    }
    contains(p) {
        if (p instanceof Polygon) {
            let inside = 0;
            let outside = 0;
            for (const v of p.iterVertices()) {
                const contained = this.polyList.some(ipoly => ipoly.contains(v) !== Contains_1.Position.OUTSIDE);
                if (contained) {
                    inside++;
                }
                else {
                    outside++;
                }
            }
            if (inside > 0 && outside === 0) {
                return Contains_1.Position.INSIDE;
            }
            if (outside > 0 && inside === 0) {
                return Contains_1.Position.OUTSIDE;
            }
            return Contains_1.Position.BOUNDARY;
        }
        if (p instanceof Array) {
            p = { x: p[0], y: p[1] };
        }
        let inside = 0;
        let boundary = 0;
        for (const ipoly of this.polyList) {
            const pos = ipoly.contains(p);
            if (pos === Contains_1.Position.INSIDE) {
                inside++;
            }
            else if (pos === Contains_1.Position.BOUNDARY) {
                boundary++;
            }
        }
        if (inside > 0) {
            return Contains_1.Position.INSIDE;
        }
        if (boundary > 0) {
            return Contains_1.Position.BOUNDARY;
        }
        return Contains_1.Position.OUTSIDE;
    }
    explode() {
        if (this.explosion) {
            return this.explosion;
        }
        const bounds = [];
        const holes = new Set();
        for (const poly of this.polyList) {
            if (poly.isHole) {
                holes.add(poly);
            }
            else {
                bounds.push(poly);
            }
        }
        if (bounds.length === 1) {
            this.explosion = [this];
        }
        else {
            const result = [];
            for (const b of bounds) {
                const components = [b];
                for (const h of holes) {
                    if (Contains_1.wn_poly(h.get(0), b.pointList) === Contains_1.Position.INSIDE) {
                        components.push(h);
                        holes.delete(h);
                    }
                }
                if (components.length === 1) {
                    result.push(b);
                }
                else {
                    result.push(new MultiPolygon(components));
                }
            }
            this.explosion = result;
        }
        return this.explosion;
    }
    [util_1.isContributing](polyIndex) {
        return this.polyList[polyIndex][util_1.isContributing](0);
    }
    [util_1.setContributing](polyIndex, contributes) {
        this.polyList[polyIndex][util_1.setContributing](0, contributes);
    }
    toVertices() {
        if (!this.json) {
            const bounds = [];
            const holes = [];
            for (const poly of this.polyList) {
                const { bounds: nb, holes: nh } = poly.toVertices();
                bounds.push(...nb);
                holes.push(...nh);
            }
            this.json = { bounds, holes };
        }
        return this.json;
    }
    getHull() {
        if (this.hull) {
            return this.hull;
        }
        const e = this.explode();
        if (e[0] === this) {
            this.hull = this.polyList[0].getHull();
        }
        else {
            const candidates = [];
            for (const p of this.polyList) {
                if (p.isHole) {
                    continue;
                }
                for (const v of p.getHull().iterVertices()) {
                    candidates.push(v);
                }
            }
            this.hull = new SimplePolygon(hull_1.convexHull(candidates), false);
        }
        return this.hull;
    }
}

})();

GPC = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=gpc.bundle.js.map