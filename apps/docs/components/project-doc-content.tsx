import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';

export interface MarkdownLinkBase {
  owner: string;
  repo: string;
  branch: string;
  /** Directory the rendered file lives in, relative to the repo root (e.g. "docs" or ""). */
  dir: string;
}

function isRelativeUrl(url: string) {
  return !/^([a-z][a-z0-9+.-]*:)?\/\//i.test(url) && !url.startsWith('#') && !url.startsWith('mailto:');
}

/** Resolves a relative markdown link/image against the repo file it came from. */
function resolveRelativeUrl(url: string, base: MarkdownLinkBase, kind: 'blob' | 'raw') {
  const dir = base.dir ? `${base.dir}/` : '';
  const path = new URL(url, `https://x/${dir}`).pathname.replace(/^\//, '');
  return kind === 'raw'
    ? `https://raw.githubusercontent.com/${base.owner}/${base.repo}/${base.branch}/${path}`
    : `https://github.com/${base.owner}/${base.repo}/blob/${base.branch}/${path}`;
}

// remarkHeading assigns the same heading ids that fumadocs-core's getTableOfContents()
// computes, so a TOC built from that function actually jumps to the right place here.
export function ProjectDocContent({ content, linkBase }: { content: string; linkBase: MarkdownLinkBase }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkHeading]}
      components={{
        a: ({ href, children, node: _node, ...rest }) => (
          <a href={href && isRelativeUrl(href) ? resolveRelativeUrl(href, linkBase, 'blob') : href} {...rest}>
            {children}
          </a>
        ),
        img: ({ src, alt, node: _node, ...rest }) => (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote GitHub content, dimensions unknown
          <img
            src={typeof src === 'string' && isRelativeUrl(src) ? resolveRelativeUrl(src, linkBase, 'raw') : src}
            alt={alt ?? ''}
            {...rest}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
