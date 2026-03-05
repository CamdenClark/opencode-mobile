export default {
  client: 'fetch',
  input: 'http://aphex.tail85c1ab.ts.net:4096/doc',
  output: 'src/api',
  plugins: [
    '@tanstack/react-query',
  ],
};