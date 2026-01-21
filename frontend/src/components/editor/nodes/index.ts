// Central export point for all custom Lexical nodes
// This helps prevent duplicate node registration issues during hot reload

export { ProductNode, $createProductNode, $isProductNode } from './ProductNode';
export type { SerializedProductNode } from './ProductNode';
