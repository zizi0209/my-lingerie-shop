'use client';

interface TextBlockContent {
  title?: string;
  content?: string;
}

interface TextBlockProps {
  content: TextBlockContent;
}

export default function TextBlock({ content }: TextBlockProps) {
  const { title = '', content: text = '' } = content;

  if (!title && !text) return null;

  return (
    <section className="bg-gray-50 dark:bg-gray-900 py-12 md:py-20 transition-colors">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        {title && (
          <h2 className="text-3xl md:text-4xl font-serif font-light mb-6 text-gray-900 dark:text-white">
            {title}
          </h2>
        )}
        {text && (
          <div 
            className="prose prose-lg dark:prose-invert mx-auto text-gray-600 dark:text-gray-400"
            dangerouslySetInnerHTML={{ __html: text }}
          />
        )}
      </div>
    </section>
  );
}
