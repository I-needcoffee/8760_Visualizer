export const config = {
  runtime: 'edge', // Using Edge runtime since all it does is fetch
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('URL is required', { status: 400 });
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return new Response(`Failed to fetch from upstream: ${response.statusText}`, { status: response.status });
    }

    const text = await response.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
