"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryFields = exports.categoryOperations = void 0;
exports.categoryOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['category'] } },
        options: [
            {
                name: 'Get All',
                value: 'getAll',
                description: 'Get all transaction categories',
                action: 'Get all categories',
            },
        ],
        default: 'getAll',
    },
];
exports.categoryFields = [];
//# sourceMappingURL=CategoryDescription.js.map