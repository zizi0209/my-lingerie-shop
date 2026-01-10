'use client';

interface TextBlockContent {
  title?: string;
  content?: string;
}

interface TextBlockProps {
  content: TextBlockContent;
}

export default function TextBlock({ content }: TextBlockProps) {
  const { title = '', content: html = '' } = content;

  if (!title && !html) return null;

  // Check if content contains HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(html);

  return (
    <section className="bg-gray-50 dark:bg-gray-900 py-12 md:py-20 transition-colors">
      <div className="container mx-auto px-4 max-w-4xl">
        {title && (
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-8 text-gray-900 dark:text-white text-center">
            {title}
          </h2>
        )}
        {html && (
          isHtml ? (
            <div
              className="prose prose-lg dark:prose-invert max-w-none
                prose-headings:font-serif prose-headings:font-light
                prose-p:text-gray-600 prose-p:dark:text-gray-300 prose-p:leading-relaxed
                prose-ul:text-gray-600 prose-ul:dark:text-gray-300
                prose-ol:text-gray-600 prose-ol:dark:text-gray-300
                prose-li:text-gray-600 prose-li:dark:text-gray-300
                prose-a:text-primary-600 prose-a:dark:text-primary-400
                prose-strong:text-gray-900 prose-strong:dark:text-white
                prose-blockquote:border-primary-500 prose-blockquote:bg-white prose-blockquote:dark:bg-gray-800 prose-blockquote:rounded-r-lg"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed text-center">
              {html}
            </p>
          )
        )}
      </div>
    </section>
  );
}
