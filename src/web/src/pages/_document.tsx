import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';
import createCache from '@emotion/cache';
import createEmotionServer from '@emotion/server/create-instance';
import { EGYPTIAN_PALETTE, TYPOGRAPHY_CONFIG } from '../config/theme.config';

// @emotion/cache v11.11.0
// @emotion/server v11.11.0

/**
 * Custom Document class for Egyptian Map of Pi marketplace
 * Implements RTL support, PWA features, and cultural adaptations for Egyptian users
 */
class MyDocument extends Document {
  // Store emotion style tags for SSR
  private emotionStyleTags: JSX.Element[] = [];

  constructor(props: any) {
    super(props);
  }

  /**
   * Generates initial props with RTL support and emotion styles
   * @param ctx - Document context
   */
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    // Create RTL-aware emotion cache
    const cache = createCache({
      key: 'egyptian-map-pi',
      prepend: true,
      stylisPlugins: [],
      // Enable RTL transformation
      rtl: true,
    });

    const { extractCriticalToChunks } = createEmotionServer(cache);

    // Original getInitialProps
    const initialProps = await Document.getInitialProps(ctx);

    // Extract critical CSS
    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style
        data-emotion={`${style.key} ${style.ids.join(' ')}`}
        key={style.key}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: style.css }}
      />
    ));

    return {
      ...initialProps,
      styles: [
        ...React.Children.toArray(initialProps.styles),
        ...emotionStyleTags,
      ],
    };
  }

  render(): JSX.Element {
    return (
      <Html lang="ar" dir="rtl">
        <Head>
          {/* Character Set */}
          <meta charSet="utf-8" />

          {/* Viewport Configuration */}
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

          {/* PWA Primary Color */}
          <meta name="theme-color" content={EGYPTIAN_PALETTE.primary.main} />

          {/* PWA Manifest */}
          <link rel="manifest" href="/manifest.json" />

          {/* Favicon and Icons */}
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
          <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color={EGYPTIAN_PALETTE.primary.main} />

          {/* Primary Font Preloading */}
          <link
            rel="preload"
            href="/fonts/cairo-v20-arabic-regular.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/cairo-v20-arabic-bold.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />

          {/* Security Headers */}
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="format-detection" content="telephone=no" />
          <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" />

          {/* SEO & Social */}
          <meta name="application-name" content="Egyptian Map of Pi" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Egyptian Map of Pi" />
          <meta name="description" content="Egyptian marketplace powered by Pi Network" />
          <meta name="mobile-web-app-capable" content="yes" />

          {/* Accessibility & Cultural */}
          <meta name="format-detection" content="telephone=no" />
          <meta name="language" content="Arabic" />
          <meta name="robots" content="index, follow" />

          {/* Emotion Style Tags */}
          {this.emotionStyleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
          {/* Service Worker Registration */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(
                      function(registration) {
                        console.log('ServiceWorker registration successful');
                      },
                      function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                      }
                    );
                  });
                }
              `,
            }}
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument;