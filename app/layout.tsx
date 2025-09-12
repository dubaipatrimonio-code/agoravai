import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/js-sha256/0.9.0/sha256.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              // Pega dados do cliente direto do formulário
              function getClienteData() {
                  var cpf = document.querySelector('#cpf')?.value || '';
                  var telefone = document.querySelector('#telefone')?.value || '';
                  return {
                      cpf: cpf.replace(/\\D/g,''),  // só números
                      telefone: telefone.replace(/\\D/g,'')  // só números
                  };
              }

              // Inicializa Pixel com Advanced Matching
              function initPixel() {
                  var cliente = getClienteData();
                  fbq('init', '1231655365398726', {
                      external_id: cliente.cpf ? sha256(cliente.cpf) : undefined,
                      ph: cliente.telefone ? sha256(cliente.telefone) : undefined
                  });
                  fbq('track', 'PageView');
                  fbq('track', 'InitiateCheckout');
              }

              // Dispara AddPaymentInfo quando o cliente preencher dados de pagamento
              function trackAddPaymentInfo() {
                  fbq('track', 'AddPaymentInfo');
              }

              // Dispara Purchase quando a API retornar sucesso
              function trackPurchase(amount, orderId) {
                  fbq('track', 'Purchase', {
                      value: amount,
                      currency: 'BRL',
                      eventID: orderId
                  });
              }

              // Inicializa Pixel quando a página carregar
              window.addEventListener('DOMContentLoaded', initPixel);
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1231655365398726&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
