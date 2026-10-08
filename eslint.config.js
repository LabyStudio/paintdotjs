const path = require("node:path");

const paintDotJsRules = {
    rules: {
        "one-class-per-file": {
            meta: {
                type: "suggestion",
                messages: {
                    nested: "Move {{name}} to its own top-level file.",
                    additional: "Move {{name}} to its own file; this file already defines {{first}}.",
                    filename: "Rename this file to {{expected}} so it matches class {{name}}."
                },
                schema: []
            },
            create(context) {
                const classes = [];
                return {
                    ClassDeclaration(node) {
                        classes.push(node);
                        if (node.parent.type !== "Program") {
                            context.report({
                                node,
                                messageId: "nested",
                                data: {name: node.id?.name || "this class"}
                            });
                        }
                    },
                    "Program:exit"() {
                        if (classes.length === 0) {
                            return;
                        }
                        const first = classes[0].id?.name || "another class";
                        for (const node of classes.slice(1)) {
                            context.report({
                                node,
                                messageId: "additional",
                                data: {name: node.id?.name || "This class", first}
                            });
                        }

                        const className = classes[0].id?.name;
                        const filename = path.basename(context.filename);
                        if (className && filename !== className + ".js") {
                            context.report({
                                node: classes[0],
                                messageId: "filename",
                                data: {name: className, expected: className + ".js"}
                            });
                        }
                    }
                };
            }
        }
    }
};

module.exports = [
    {
        plugins: {
            paintdotjs: paintDotJsRules
        },
        rules: {
            curly: ["error", "all"],
            "paintdotjs/one-class-per-file": "error"
        }
    }
];
