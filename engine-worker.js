// Report downloads and HTTP errors that Stockfish's loader otherwise hides.
const originalFetch = self.fetch.bind(self);
let downloaded = 0;
self.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.url}`);
    if (!response.body) return response;
    const reader = response.body.getReader();
    return new Response(new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          downloaded += value.byteLength;
          self.postMessage({ type: 'download', bytes: downloaded });
          controller.enqueue(value);
        } catch (error) {
          self.postMessage({ type: 'load-error', message: error.message });
          controller.error(error);
        }
      },
      cancel(reason) { return reader.cancel(reason); },
    }), { headers: response.headers, status: response.status });
  } catch (error) {
    self.postMessage({ type: 'load-error', message: error.message });
    throw error;
  }
};
importScripts('./node_modules/stockfish/src/stockfish-17.1-single-a496a04.js');
