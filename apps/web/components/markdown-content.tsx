import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownLinkBase {
  owner: string;
  repo: string;
  branch: string;
  /** Directory the rendered file lives in, relative to the repo root (e.g. "docs" or ""). */
  dir: string;
}

function isRelativeUrl(url: string) {
  return !/^([a-z][a-z0-9+.-]*:)?\/\//i.test(url) && !url.startsWith("#") && !url.startsWith("mailto:");
}

/** Resolves a relative markdown link/image against the repo file it came from. */
function resolveRelativeUrl(url: string, base: MarkdownLinkBase, kind: "blob" | "raw") {
  const dir = base.dir ? `${base.dir}/` : "";
  const path = new URL(url, `https://x/${dir}`).pathname.replace(/^\//, "");
  return kind === "raw"
    ? `https://raw.githubusercontent.com/${base.owner}/${base.repo}/${base.branch}/${path}`
    : `https://github.com/${base.owner}/${base.repo}/blob/${base.branch}/${path}`;
}

export function MarkdownContent({ content, linkBase }: { content: string; linkBase?: MarkdownLinkBase }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-a:text-navy dark:prose-a:text-yellow">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- excluded so it isn't spread onto the DOM node
          a: ({ href, children, node: _node, ...rest }) => (
            <a href={href && linkBase && isRelativeUrl(href) ? resolveRelativeUrl(href, linkBase, "blob") : href} {...rest}>
              {children}
            </a>
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- excluded so it isn't spread onto the DOM node
          img: ({ src, alt, node: _node, ...rest }) => (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote GitHub content, dimensions unknown
            <img
              src={typeof src === "string" && linkBase && isRelativeUrl(src) ? resolveRelativeUrl(src, linkBase, "raw") : src}
              alt={alt ?? ""}
              {...rest}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
