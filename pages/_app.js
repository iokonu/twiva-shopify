import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';
import '@shopify/polaris/build/esm/styles.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  const host = router.query.host || pageProps.host;
  
  // Don't render App Bridge provider without host
  if (!host) {
    return (
      <AppProvider i18n={{}}>
        <Component {...pageProps} />
      </AppProvider>
    );
  }
  
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
    host: host,
    forceRedirect: true,
  };

  return (
    <AppBridgeProvider config={config}>
      <AppProvider i18n={{}}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;
