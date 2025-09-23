# Graphing Calculator

A powerful, interactive graphing calculator built with HTML, CSS, and JavaScript. Plot mathematical functions and analyze their properties in real-time.

## 🚀 Live Demo

**[Try it out here!](https://joshuapark5678.github.io/graphing_calc/)**

## Features

-   **Interactive Graphing**: Plot mathematical functions with real-time visualization
-   **Function Analysis**: Automatic analysis of mathematical properties
-   **Wide Function Support**: Supports trigonometric, logarithmic, exponential, and polynomial functions
-   **User-Friendly Interface**: Clean, modern design with helpful tips and examples
-   **Responsive Design**: Works on desktop and mobile devices

## Supported Functions

### Basic Operations

-   Addition, subtraction, multiplication, division
-   Exponentiation (use `^` operator)
-   Parentheses for grouping

### Mathematical Functions

-   **Trigonometric**: `sin(x)`, `cos(x)`, `tan(x)`, `csc(x)`, `sec(x)`, `cot(x)`
-   **Logarithmic**: `log(x)` (base 10), `ln(x)` (natural log)
-   **Other**: `sqrt(x)`, `abs(x)`, `exp(x)`, `floor(x)`, `ceil(x)`, `round(x)`

### Constants

-   `pi` for π (3.14159...)
-   `e` for Euler's number (2.71828...)

## Usage Examples

```
x^2                    // Quadratic function
sin(x) + cos(x)       // Trigonometric combination
2*x + 3               // Linear function
sqrt(x^2 + 1)         // Square root function
1/(x^2 + 1)           // Rational function
exp(-x^2)             // Gaussian function
```

## Development

### Local Development

1. Clone the repository
2. Open `index.html` in your web browser
3. Start plotting functions!

### Deployment

This project is automatically deployed to GitHub Pages on every push to the main branch.

## File Structure

```
├── index.html          # Main HTML file with UI structure
├── graph.js            # JavaScript logic for parsing and plotting
├── README.md           # Project documentation
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions deployment workflow
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).
