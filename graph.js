const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let gridSize = 20;
let gridDimensions = 40;
let mouseCoord = null;
let currentExpression = "x";
let currentFunction = null;

// Mathematical expression parser
class ExpressionParser {
    constructor() {
        this.constants = {
            pi: Math.PI,
            e: Math.E,
        };

        this.functions = {
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            csc: (x) => 1 / Math.sin(x),
            sec: (x) => 1 / Math.cos(x),
            cot: (x) => 1 / Math.tan(x),
            log: Math.log10,
            ln: Math.log,
            sqrt: Math.sqrt,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
            exp: Math.exp,
        };
    }

    // Tokenize the expression
    tokenize(expression) {
        const tokens = [];
        const regex = /(\d+\.?\d*)|([a-zA-Z]+)|([+\-*/^()])|(\s+)/g;
        let match;

        while ((match = regex.exec(expression)) !== null) {
            if (match[4]) continue; // Skip whitespace
            tokens.push(match[0]);
        }

        return tokens;
    }

    // Parse expression to create an evaluatable function
    parse(expression) {
        try {
            if (!expression || expression.trim() === "") {
                throw new Error("Expression cannot be empty");
            }

            console.log("Original expression:", expression);

            // Replace common mathematical notation
            expression = expression.toLowerCase();
            expression = expression.replace(/\^/g, "**"); // Convert ^ to **

            // Replace constants first
            for (const [name, value] of Object.entries(this.constants)) {
                const regex = new RegExp(`\\b${name}\\b`, "g");
                expression = expression.replace(regex, value.toString());
            }

            // Replace functions with Math. equivalents
            for (const [name, func] of Object.entries(this.functions)) {
                const regex = new RegExp(`\\b${name}\\(`, "g");
                if (name === "log") {
                    expression = expression.replace(regex, "Math.log10(");
                } else if (name === "ln") {
                    expression = expression.replace(regex, "Math.log(");
                } else if (name === "csc") {
                    // We need to handle the full function call, not just the opening
                    const fullRegex = new RegExp(`\\bcsc\\(([^)]+)\\)`, "g");
                    expression = expression.replace(
                        fullRegex,
                        "(1/Math.sin($1))"
                    );
                } else if (name === "sec") {
                    const fullRegex = new RegExp(`\\bsec\\(([^)]+)\\)`, "g");
                    expression = expression.replace(
                        fullRegex,
                        "(1/Math.cos($1))"
                    );
                } else if (name === "cot") {
                    const fullRegex = new RegExp(`\\bcot\\(([^)]+)\\)`, "g");
                    expression = expression.replace(
                        fullRegex,
                        "(1/Math.tan($1))"
                    );
                } else {
                    expression = expression.replace(regex, `Math.${name}(`);
                }
            }

            // Add multiplication between number and variable/parenthesis
            expression = expression.replace(/(\d)([a-z])/g, "$1*$2"); // Add multiplication between number and variable
            expression = expression.replace(/\)([a-z])/g, ")*$1"); // Add multiplication between ) and variable
            expression = expression.replace(/(\d)\(/g, "$1*("); // Add multiplication between number and (
            expression = expression.replace(/\)(\d)/g, ")*$1"); // Add multiplication between ) and number

            // Only add multiplication for single variables before parenthesis (not function names)
            expression = expression.replace(/\b([a-z])\(/g, "$1*("); // Add multiplication between single variable and (

            console.log("Final expression:", expression);

            // Validate parentheses
            let openParens = 0;
            for (let char of expression) {
                if (char === "(") openParens++;
                if (char === ")") openParens--;
                if (openParens < 0) throw new Error("Mismatched parentheses");
            }
            if (openParens !== 0) throw new Error("Mismatched parentheses");

            // Create a function that evaluates the expression for a given x
            const func = new Function(
                "x",
                `
                try {
                    const result = ${expression};
                    return result;
                } catch (e) {
                    return NaN;
                }
            `
            );

            // Test the function with multiple sample values
            const testValues = [0, 1, -1, 0.5, 2];
            let hasValidResult = false;

            for (const testX of testValues) {
                try {
                    const testResult = func(testX);
                    if (
                        typeof testResult === "number" &&
                        isFinite(testResult)
                    ) {
                        hasValidResult = true;
                        break;
                    }
                } catch (e) {
                    // Continue testing other values
                }
            }

            if (!hasValidResult) {
                throw new Error(
                    "Expression does not produce valid numeric results"
                );
            }

            return func;
        } catch (error) {
            if (error.message.includes("Invalid expression")) {
                throw error;
            }
            throw new Error(`Invalid expression: ${error.message}`);
        }
    }

    // Evaluate expression at a given x value
    evaluate(func, x) {
        try {
            const result = func(x);
            if (typeof result !== "number") {
                return NaN;
            }
            return result;
        } catch (error) {
            return NaN;
        }
    }
}

// Function analyzer for mathematical properties
class FunctionAnalyzer {
    constructor(parser) {
        this.parser = parser;
    }

    analyzeFunction(func, expression) {
        const analysis = {
            isFunction: true,
            isOdd: null,
            isEven: null,
            isOneToOne: null,
            domain: null,
            range: null,
            properties: [],
        };

        try {
            // Test if it's a function (passes vertical line test)
            analysis.isFunction = this.isFunction(func);

            if (analysis.isFunction) {
                // Test for odd/even properties
                const symmetry = this.checkSymmetry(func);
                analysis.isOdd = symmetry.isOdd;
                analysis.isEven = symmetry.isEven;

                // Test for one-to-one (injective)
                analysis.isOneToOne = this.isOneToOne(func);

                // Analyze domain and range
                const domainRange = this.analyzeDomainRange(func, expression);
                analysis.domain = domainRange.domain;
                analysis.range = domainRange.range;

                // Build properties array
                if (analysis.isEven) analysis.properties.push("Even");
                if (analysis.isOdd) analysis.properties.push("Odd");
                if (analysis.isOneToOne) analysis.properties.push("One-to-One");
                if (!analysis.isEven && !analysis.isOdd)
                    analysis.properties.push("Neither Even nor Odd");
            }
        } catch (error) {
            console.error("Analysis error:", error);
        }

        return analysis;
    }

    isFunction(func) {
        // A relation is a function if each x-value maps to exactly one y-value
        // For our purposes, if the function evaluates without multiple values, it's a function
        // This is a simplified check since we're dealing with single-valued functions
        const testPoints = [-5, -2, 0, 1, 3, 5];

        for (const x of testPoints) {
            try {
                const y = this.parser.evaluate(func, x);
                if (typeof y !== "number") {
                    return false;
                }
            } catch (error) {
                // If evaluation fails, we can't determine - assume it's still a function
                continue;
            }
        }
        return true;
    }

    checkSymmetry(func) {
        const testPoints = [-3, -2, -1, -0.5, 0.5, 1, 2, 3];
        let oddCount = 0;
        let evenCount = 0;
        let totalTests = 0;
        const tolerance = 1e-10;

        for (const x of testPoints) {
            if (x === 0) continue; // Skip x=0 for symmetry tests

            try {
                const fx = this.parser.evaluate(func, x);
                const fNegX = this.parser.evaluate(func, -x);

                if (
                    isNaN(fx) ||
                    isNaN(fNegX) ||
                    !isFinite(fx) ||
                    !isFinite(fNegX)
                ) {
                    continue;
                }

                totalTests++;

                // Check if f(-x) = f(x) (even function)
                if (Math.abs(fNegX - fx) < tolerance) {
                    evenCount++;
                }

                // Check if f(-x) = -f(x) (odd function)
                if (Math.abs(fNegX - -fx) < tolerance) {
                    oddCount++;
                }
            } catch (error) {
                continue;
            }
        }

        const threshold = 0.8; // 80% of tests must pass
        return {
            isEven: totalTests > 0 && evenCount / totalTests >= threshold,
            isOdd: totalTests > 0 && oddCount / totalTests >= threshold,
        };
    }

    isOneToOne(func) {
        // Test if function is one-to-one (injective) by checking if different x values give different y values
        const testPoints = [];
        for (let i = -5; i <= 5; i += 0.5) {
            testPoints.push(i);
        }

        const yValues = [];
        const tolerance = 1e-8;

        for (const x of testPoints) {
            try {
                const y = this.parser.evaluate(func, x);
                if (isNaN(y) || !isFinite(y)) continue;

                // Check if this y-value is approximately equal to any previous y-value
                for (const prevY of yValues) {
                    if (Math.abs(y - prevY) < tolerance) {
                        return false; // Found duplicate y-value, not one-to-one
                    }
                }
                yValues.push(y);
            } catch (error) {
                continue;
            }
        }

        return yValues.length > 5; // Need sufficient data points to make determination
    }

    analyzeDomainRange(func, expression) {
        const domain = this.analyzeDomain(func, expression);
        const range = this.analyzeRange(func);
        return { domain, range };
    }

    analyzeDomain(func, expression) {
        // Common domain restrictions based on expression pattern
        const expr = expression.toLowerCase();

        // Check for square roots
        if (expr.includes("sqrt(")) {
            // For sqrt functions, domain is where argument >= 0
            if (expr.match(/sqrt\(x\)/)) {
                return "x ≥ 0";
            } else if (expr.match(/sqrt\([^)]*x[^)]*\)/)) {
                return "Expression under √ must be ≥ 0";
            }
        }

        // Check for logarithms
        if (expr.includes("log(") || expr.includes("ln(")) {
            if (expr.match(/log\(x\)|ln\(x\)/)) {
                return "x > 0";
            } else if (expr.match(/log\([^)]*x[^)]*\)|ln\([^)]*x[^)]*\)/)) {
                return "Expression inside log must be > 0";
            }
        }

        // Check for denominators that could be zero
        if (expr.includes("/x") || expr.includes("1/x")) {
            return "x ≠ 0";
        }

        // Check for trigonometric functions with restrictions
        if (expr.includes("tan(x)") || expr.includes("cot(x)")) {
            return "x ≠ π/2 + nπ, where n is any integer";
        }
        if (expr.includes("sec(x)")) {
            return "x ≠ π/2 + nπ, where n is any integer";
        }
        if (expr.includes("csc(x)")) {
            return "x ≠ nπ, where n is any integer";
        }

        // Test for general restrictions by sampling
        const restrictions = [];
        const testRange = [-20, 20];
        const step = 0.1;

        for (let x = testRange[0]; x <= testRange[1]; x += step) {
            const y = this.parser.evaluate(func, x);
            if (!isFinite(y)) {
                // Found a restriction point
                const rounded = Math.round(x * 10) / 10;
                if (!restrictions.some((r) => Math.abs(r - rounded) < 0.05)) {
                    restrictions.push(rounded);
                }
            }
        }

        if (restrictions.length > 0) {
            if (restrictions.length <= 5) {
                return `x ≠ ${restrictions.join(", ")}`;
            } else {
                return "Multiple restrictions (see graph for asymptotes)";
            }
        }

        return "All real numbers (ℝ)";
    }

    analyzeRange(func) {
        // Sample the function over a reasonable range to get local behavior
        const testRange = [-50, 50];
        const step = 0.1;
        let minY = Infinity;
        let maxY = -Infinity;
        let hasInfiniteValues = false;
        let hasNegativeInfinite = false;
        let hasPositiveInfinite = false;
        let validPoints = 0;

        for (let x = testRange[0]; x <= testRange[1]; x += step) {
            const y = this.parser.evaluate(func, x);

            if (!isFinite(y)) {
                hasInfiniteValues = true;
                if (y === Infinity) hasPositiveInfinite = true;
                if (y === -Infinity) hasNegativeInfinite = true;
                continue;
            }

            validPoints++;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        // Handle infinite values
        if (hasInfiniteValues) {
            if (hasPositiveInfinite && hasNegativeInfinite) {
                return "All real numbers (ℝ)";
            } else if (hasPositiveInfinite) {
                return "y → +∞";
            } else if (hasNegativeInfinite) {
                return "y → -∞";
            }
        }

        if (!isFinite(minY) || !isFinite(maxY) || validPoints < 10) {
            return "Cannot determine range";
        }

        // Test for quadratic and higher-degree polynomial behavior FIRST
        const testPoints = [-100, -10, 0, 10, 100];
        const testValues = testPoints.map((x) => this.parser.evaluate(func, x));

        // Check if all test values are finite
        if (testValues.every((y) => isFinite(y))) {
            // Check for parabolic behavior (quadratic-like)
            const y_neg100 = testValues[0],
                y_neg10 = testValues[1],
                y_0 = testValues[2],
                y_10 = testValues[3],
                y_100 = testValues[4];

            // If function has a minimum near 0 and grows large at extremes, it's likely y ≥ minimum
            if (
                y_neg100 > 100 &&
                y_100 > 100 &&
                y_0 <= Math.min(y_neg100, y_100)
            ) {
                if (minY >= -0.1 && minY <= 0.1) {
                    return "y ≥ 0";
                } else {
                    return `y ≥ ${minY.toFixed(2)}`;
                }
            }

            // If function has a maximum near 0 and becomes very negative at extremes
            if (
                y_neg100 < -100 &&
                y_100 < -100 &&
                y_0 >= Math.max(y_neg100, y_100)
            ) {
                if (maxY >= -0.1 && maxY <= 0.1) {
                    return "y ≤ 0";
                } else {
                    return `y ≤ ${maxY.toFixed(2)}`;
                }
            }

            // Check for strictly increasing behavior (linear with positive slope)
            if (
                y_neg100 < y_neg10 &&
                y_neg10 < y_0 &&
                y_0 < y_10 &&
                y_10 < y_100
            ) {
                const slope = (y_100 - y_neg100) / 200;
                if (Math.abs(slope) > 0.1) {
                    return "All real numbers (ℝ)";
                }
            }

            // Check for strictly decreasing behavior (linear with negative slope)
            if (
                y_neg100 > y_neg10 &&
                y_neg10 > y_0 &&
                y_0 > y_10 &&
                y_10 > y_100
            ) {
                const slope = (y_100 - y_neg100) / 200;
                if (Math.abs(slope) > 0.1) {
                    return "All real numbers (ℝ)";
                }
            }
        }

        // Check if function appears constant
        const tolerance = 0.01;
        if (Math.abs(maxY - minY) < tolerance) {
            return `y ≈ ${((minY + maxY) / 2).toFixed(
                2
            )} (approximately constant)`;
        }

        // Check for common bounded ranges
        if (minY >= -1.1 && maxY <= 1.1 && minY <= -0.9 && maxY >= 0.9) {
            return "-1 ≤ y ≤ 1"; // Trigonometric functions
        }

        if (minY >= -0.1 && minY <= 0.1) {
            if (maxY > 100) {
                return "y ≥ 0";
            } else {
                return `0 ≤ y ≤ ${maxY.toFixed(2)}`;
            }
        }

        if (maxY >= -0.1 && maxY <= 0.1) {
            if (minY < -100) {
                return "y ≤ 0";
            } else {
                return `${minY.toFixed(2)} ≤ y ≤ 0`;
            }
        }

        // Check if range is too large to be meaningfully bounded
        if (Math.abs(maxY - minY) > 100) {
            return "All real numbers (ℝ)";
        }

        // For well-behaved bounded functions
        return `${minY.toFixed(2)} ≤ y ≤ ${maxY.toFixed(2)}`;
    }
}

const parser = new ExpressionParser();
const analyzer = new FunctionAnalyzer(parser);
const expressionInput = document.getElementById("expressionInput");
const plotButton = document.getElementById("plotButton");
const errorMessage = document.getElementById("errorMessage");

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    // Hide analysis
    document.getElementById("analysisContent").classList.remove("show");
    document.getElementById("noAnalysis").style.display = "block";
}

function hideError() {
    errorMessage.style.display = "none";
}

function showAnalysis(analysis, expression) {
    let html = "";

    if (analysis.isFunction) {
        html += `<p><strong>Type:</strong> <span style="color: #4CAF50;">Function</span></p>`;

        // Domain and Range
        if (analysis.domain) {
            html += `<p><strong>Domain:</strong> ${analysis.domain}</p>`;
        }
        if (analysis.range) {
            html += `<p><strong>Range:</strong> ${analysis.range}</p>`;
        }

        if (analysis.properties.length > 0) {
            html += `<p><strong>Properties:</strong> ${analysis.properties.join(
                ", "
            )}</p>`;
        }

        // Additional details
        html += "<p><strong>Details:</strong></p>";
        html += "<ul>";

        if (analysis.isEven) {
            html += "<li>Symmetric about y-axis (f(-x) = f(x))</li>";
        } else if (analysis.isOdd) {
            html += "<li>Symmetric about origin (f(-x) = -f(x))</li>";
        } else {
            html += "<li>No symmetry about y-axis or origin</li>";
        }

        if (analysis.isOneToOne) {
            html += "<li>Passes horizontal line test (injective)</li>";
        } else {
            html += "<li>Does not pass horizontal line test</li>";
        }

        html += "</ul>";
    } else {
        html += `<p><strong>Type:</strong> <span style="color: #FF9800;">Relation (not a function)</span></p>`;
        html += "<p>Fails the vertical line test</p>";
    }

    document.getElementById("analysisContent").innerHTML = html;
    document.getElementById("analysisContent").classList.add("show");
    document.getElementById("noAnalysis").style.display = "none";
}

function updateFunction() {
    const expression = expressionInput.value.trim();
    if (!expression) {
        currentFunction = null;
        hideError();
        document.getElementById("analysisContent").classList.remove("show");
        document.getElementById("noAnalysis").style.display = "block";
        render();
        return;
    }

    try {
        currentFunction = parser.parse(expression);
        currentExpression = expression;
        hideError();

        // Analyze the function
        const analysis = analyzer.analyzeFunction(currentFunction, expression);
        showAnalysis(analysis, expression);

        render();
    } catch (error) {
        showError(error.message);
        currentFunction = null;
        render();
    }
}

// Event listeners
expressionInput.addEventListener("input", updateFunction);
plotButton.addEventListener("click", updateFunction);
expressionInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        updateFunction();
    }
});

// Initialize with a default function
expressionInput.value = "x";
updateFunction();

// Zoom handler
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (event.deltaY < 0) {
        gridSize = Math.min(gridSize + gridSize / 10, 100);
    } else {
        gridSize = Math.max(gridSize - gridSize / 10, 1);
    }
    gridDimensions = Math.floor(canvas.width / gridSize) + 2;
    if (gridDimensions % 2 !== 0) {
        gridDimensions += 1;
    }
    render();
});

function drawLine(startX, startY, endX, endY, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.closePath();
    ctx.stroke();
}

function logicalToCanvas(x, y) {
    return [canvas.width / 2 + x * gridSize, canvas.height / 2 - y * gridSize];
}

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    // Convert to logical coordinates
    const logicalX = ((mouseX - canvas.width / 2) / gridSize).toFixed(2);
    const logicalY = ((canvas.height / 2 - mouseY) / gridSize).toFixed(2);
    mouseCoord = { x: logicalX, y: logicalY, px: mouseX, py: mouseY };
    render();
});

canvas.addEventListener("mouseleave", () => {
    mouseCoord = null;
    render();
});

function drawAsymptotes() {
    if (!currentFunction) return;

    const asymptotes = [];

    // Get the current visible x range based on zoom level
    const xMin = -canvas.width / (2 * gridSize);
    const xMax = canvas.width / (2 * gridSize);
    const xRange = xMax - xMin;

    // Adaptive step size based on zoom level
    const step = xRange / 2000; // More points when zoomed in

    // Adaptive threshold based on current scale
    const yThreshold = canvas.height / (4 * gridSize); // Scale with zoom

    // Scan for vertical asymptotes
    for (let x = xMin; x <= xMax; x += step) {
        const y = parser.evaluate(currentFunction, x);
        const yLeft = parser.evaluate(currentFunction, x - step);
        const yRight = parser.evaluate(currentFunction, x + step);

        // Method 1: Check for infinite or NaN values with finite neighbors
        if (!isFinite(y)) {
            if (isFinite(yLeft) && isFinite(yRight)) {
                asymptotes.push(x);
                continue;
            }
        }

        // Method 2: Check for sign changes in large values
        if (isFinite(yLeft) && isFinite(yRight) && isFinite(y)) {
            if (Math.abs(yLeft) > yThreshold && Math.abs(yRight) > yThreshold) {
                if (Math.sign(yLeft) !== Math.sign(yRight)) {
                    asymptotes.push(x);
                    continue;
                }
            }
        }

        // Method 3: Check for very large slope changes (derivative spikes)
        if (isFinite(yLeft) && isFinite(yRight)) {
            const slope1 = Math.abs(y - yLeft) / step;
            const slope2 = Math.abs(yRight - y) / step;
            const maxSlope = Math.max(slope1, slope2);

            if (maxSlope > yThreshold / step) {
                // Check if values go to opposite infinities
                if (
                    (yLeft > yThreshold && yRight < -yThreshold) ||
                    (yLeft < -yThreshold && yRight > yThreshold)
                ) {
                    asymptotes.push(x);
                }
            }
        }
    }

    // Remove duplicate asymptotes that are too close together
    const cleanedAsymptotes = [];
    const minDistance = step * 10;

    for (const asym of asymptotes) {
        if (
            !cleanedAsymptotes.some(
                (existing) => Math.abs(existing - asym) < minDistance
            )
        ) {
            cleanedAsymptotes.push(asym);
        }
    }

    // Draw asymptote lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (const asymptoteX of cleanedAsymptotes) {
        const px = canvas.width / 2 + asymptoteX * gridSize;
        if (px >= 0 && px <= canvas.width) {
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, canvas.height);
            ctx.stroke();
        }
    }

    ctx.setLineDash([]); // Reset line dash
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    for (let row = 0; row < gridDimensions; row++) {
        for (let col = 0; col < gridDimensions; col++) {
            ctx.fillStyle = "black";
            let logicalX = col - gridDimensions / 2;
            let logicalY = row - gridDimensions / 2;
            let [canvasX, canvasY] = logicalToCanvas(logicalX, logicalY + 1);
            ctx.fillRect(canvasX, canvasY, gridSize - 1, gridSize - 1);
        }
    }

    // Draw axes
    drawLine(canvas.width / 2, 0, canvas.width / 2, canvas.height, "white");
    drawLine(0, canvas.height / 2, canvas.width, canvas.height / 2, "white");

    // Draw the function if we have one
    if (currentFunction) {
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 2;
        ctx.beginPath();

        let pathStarted = false;
        let prevY = null;
        let prevX = null;

        // Adaptive step size based on zoom level - more points when zoomed in
        const xRange = canvas.width / gridSize;
        const step = Math.max(0.1, xRange / 2000); // Minimum 0.1, but smaller when zoomed in

        for (let px = 0; px <= canvas.width; px += step) {
            const x = (px - canvas.width / 2) / gridSize;
            const y = parser.evaluate(currentFunction, x);

            if (isNaN(y) || !isFinite(y)) {
                pathStarted = false;
                continue;
            }

            const py = canvas.height / 2 - y * gridSize;

            // Dynamic off-screen limits based on zoom level
            const offScreenLimit = canvas.height * 10;
            if (py < -offScreenLimit || py > canvas.height + offScreenLimit) {
                pathStarted = false;
                continue;
            }

            // Improved discontinuity detection for asymptotes
            if (pathStarted && prevY !== null && prevX !== null) {
                const deltaY = Math.abs(py - prevY);
                const deltaX = Math.abs(x - prevX);

                // Scale thresholds with zoom level
                const jumpThreshold =
                    canvas.height / (2 * Math.sqrt(gridSize / 20));
                const smallXThreshold = 1 / gridSize; // Smaller when zoomed out

                // If there's a huge jump in y for a small change in x, it's likely an asymptote
                if (deltaY > jumpThreshold && deltaX < smallXThreshold) {
                    pathStarted = false;
                }
                // Also check for sign changes in y values (crossing asymptotes)
                else if (
                    deltaY > canvas.height / 2 &&
                    Math.sign(py) !== Math.sign(prevY)
                ) {
                    pathStarted = false;
                }
            }

            if (!pathStarted) {
                ctx.moveTo(px, py);
                pathStarted = true;
            } else {
                ctx.lineTo(px, py);
            }

            prevY = py;
            prevX = x;
        }

        ctx.stroke();

        // Draw vertical asymptotes
        drawAsymptotes();
    }

    // Draw mouse hover coordinate
    if (mouseCoord && currentFunction) {
        const logicalX = (mouseCoord.px - canvas.width / 2) / gridSize;
        const y = parser.evaluate(currentFunction, logicalX);

        if (!isNaN(y) && isFinite(y)) {
            const [curveX, curveY] = logicalToCanvas(logicalX, y);

            // Only show if mouse is near the curve
            if (Math.abs(mouseCoord.py - curveY) < 10) {
                ctx.beginPath();
                ctx.arc(curveX, curveY, 4, 0, 2 * Math.PI);
                ctx.fillStyle = "#ffff00";
                ctx.fill();

                ctx.font = "14px monospace";
                ctx.fillStyle = "#fff";
                ctx.fillText(
                    `(${logicalX.toFixed(2)}, ${y.toFixed(2)})`,
                    curveX + 10,
                    curveY - 10
                );
            }
        }
    }
}

render();
