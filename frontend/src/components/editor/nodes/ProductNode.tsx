'use client';

import {
  DecoratorNode,
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { Suspense, useState, useEffect, type ReactElement } from 'react';

export type SerializedProductNode = Spread<
  {
    productId: number;
    displayType: 'inline-card' | 'sidebar' | 'end-collection';
    customNote?: string;
  },
  SerializedLexicalNode
>;

export class ProductNode extends DecoratorNode<ReactElement> {
  __productId: number;
  __displayType: 'inline-card' | 'sidebar' | 'end-collection';
  __customNote?: string;

  static getType(): string {
    return 'product';
  }

  static clone(node: ProductNode): ProductNode {
    return new ProductNode(node.__productId, node.__displayType, node.__customNote, node.__key);
  }

  constructor(
    productId: number,
    displayType: 'inline-card' | 'sidebar' | 'end-collection' = 'inline-card',
    customNote?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__productId = productId;
    this.__displayType = displayType;
    this.__customNote = customNote;
  }

  static importJSON(serializedNode: SerializedProductNode): ProductNode {
    const { productId, displayType, customNote } = serializedNode;
    return $createProductNode(productId, displayType, customNote);
  }

  exportJSON(): SerializedProductNode {
    return {
      type: 'product',
      version: 1,
      productId: this.__productId,
      displayType: this.__displayType,
      customNote: this.__customNote,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    div.className = 'product-node-wrapper my-4';
    div.setAttribute('data-product-id', String(this.__productId));
    div.setAttribute('data-display-type', this.__displayType);
    return div;
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'embedded-product';
    element.setAttribute('data-product-id', String(this.__productId));
    element.setAttribute('data-display-type', this.__displayType);
    if (this.__customNote) {
      element.setAttribute('data-custom-note', this.__customNote);
    }
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-product-id')) {
          return null;
        }
        return {
          conversion: () => {
            const productId = Number(domNode.getAttribute('data-product-id'));
            const displayType = domNode.getAttribute('data-display-type') as
              | 'inline-card'
              | 'sidebar'
              | 'end-collection';
            const customNote = domNode.getAttribute('data-custom-note') || undefined;
            return {
              node: $createProductNode(productId, displayType, customNote),
            };
          },
          priority: 1,
        };
      },
    };
  }

  getProductId(): number {
    return this.__productId;
  }

  getDisplayType(): 'inline-card' | 'sidebar' | 'end-collection' {
    return this.__displayType;
  }

  getCustomNote(): string | undefined {
    return this.__customNote;
  }

  setDisplayType(displayType: 'inline-card' | 'sidebar' | 'end-collection'): void {
    const writable = this.getWritable();
    writable.__displayType = displayType;
  }

  setCustomNote(customNote: string | undefined): void {
    const writable = this.getWritable();
    writable.__customNote = customNote;
  }

  decorate(): ReactElement {
    return (
      <Suspense
        fallback={
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        }
      >
        <ProductNodeComponent
          productId={this.__productId}
          displayType={this.__displayType}
          customNote={this.__customNote}
          nodeKey={this.getKey()}
        />
      </Suspense>
    );
  }

  isInline(): boolean {
    return this.__displayType === 'inline-card';
  }

  isIsolated(): boolean {
    return true;
  }

  isTopLevel(): boolean {
    return true;
  }
}

export function $createProductNode(
  productId: number,
  displayType: 'inline-card' | 'sidebar' | 'end-collection' = 'inline-card',
  customNote?: string
): ProductNode {
  return new ProductNode(productId, displayType, customNote);
}

export function $isProductNode(node: LexicalNode | null | undefined): node is ProductNode {
  return node instanceof ProductNode;
}

// Component hiển thị trong editor
interface ProductData {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category?: { name: string };
}

function ProductNodeComponent({
  productId,
  displayType,
  customNote,
  nodeKey,
}: {
  productId: number;
  displayType: 'inline-card' | 'sidebar' | 'end-collection';
  customNote?: string;
  nodeKey: NodeKey;
}) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${baseUrl}/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data.product || data.data || data);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const displayTypeColors = {
    'inline-card': 'border-blue-300 dark:border-blue-700 from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    'sidebar': 'border-purple-300 dark:border-purple-700 from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
    'end-collection': 'border-green-300 dark:border-green-700 from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
  };

  if (loading) {
    return (
      <div className={`relative border-2 border-dashed rounded-lg p-4 bg-gradient-to-br ${displayTypeColors[displayType]} animate-pulse`}>
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={`relative border-2 border-dashed rounded-lg p-4 bg-gradient-to-br border-red-300 dark:border-red-700 from-red-50 to-red-100 dark:from-red-950 dark:to-red-900`}>
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <span className="text-xl">⚠️</span>
          <span className="text-sm font-medium">Sản phẩm không tồn tại (ID: {productId})</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative border-2 border-dashed rounded-lg p-4 bg-gradient-to-br ${displayTypeColors[displayType]}`}>
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex-shrink-0">
          {product.images?.[0] ? (
            <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {product.name}
          </div>
          {product.category && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {product.category.name}
            </div>
          )}
          <div className="flex items-baseline gap-2 mt-1">
            {product.salePrice ? (
              <>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {formatPrice(product.salePrice)}
                </span>
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          {customNote && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic truncate">
              &ldquo;{customNote}&rdquo;
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <span className="text-xs px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          {displayType}
        </span>
      </div>
    </div>
  );
}
