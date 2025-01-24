const path = require('path');

module.exports = {
  entry: './src/index.ts', // Punto de entrada principal
  output: {
    filename: 'bundle.js', // Archivo de salida
    path: path.resolve(__dirname, 'lib'), // Carpeta de salida
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'], // Extensiones a resolver
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, // Manejo de archivos TypeScript
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/, // Manejo de archivos CSS
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/, // Manejo de imágenes y fuentes
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]', // Mantener el nombre original del archivo
              outputPath: 'assets/', // Carpeta dentro de `lib`
              publicPath: 'assets/', // Ruta accesible para el navegador
            },
          },
        ],
      },
    ],
  },
  devtool: 'source-map', // Para depuración
};
