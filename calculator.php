<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$expression = $input['expression'] ?? '';
$action = $input['action'] ?? 'evaluate';

function safe_eval($expr) {
    // Clean the expression
    $expr = trim($expr);
    
    // Replace math functions
    $replacements = [
        'sin(' => 'sin(',
        'cos(' => 'cos(',
        'tan(' => 'tan(',
        'asin(' => 'asin(',
        'acos(' => 'acos(',
        'atan(' => 'atan(',
        'sqrt(' => 'sqrt(',
        'log(' => 'log10(',
        'ln(' => 'log(',
        'abs(' => 'abs(',
        'ceil(' => 'ceil(',
        'floor(' => 'floor(',
        'π' => M_PI,
        'e' => M_E,
    ];
    
    $expr = str_replace(array_keys($replacements), array_values($replacements), $expr);
    $expr = str_replace(['^'], ['**'], $expr);
    
    // Security: only allow safe characters
    if (!preg_match('/^[0-9\s\+\-\*\/\(\)\.\,\%\*sincotagqrtlbepf10M_PIEMEX]+$/i', $expr)) {
        // fallback: more permissive but still safe
        if (!preg_match('/^[0-9\s\+\-\*\/\(\)\.\,\%\^\!sincotagqrtlbepfABCDEFGHIJKLMNOPQRSTUVWXYZ_10]+$/i', $expr)) {
            return ['error' => 'Invalid expression'];
        }
    }
    
    try {
        $result = @eval("return ($expr);");
        if ($result === false || $result === null) {
            return ['error' => 'Calculation error'];
        }
        return ['result' => $result];
    } catch (Throwable $e) {
        return ['error' => 'Syntax error: ' . $e->getMessage()];
    }
}

function calculate_action($action, $value, $extra = null) {
    $val = floatval($value);
    switch ($action) {
        case 'sin':   return ['result' => sin(deg2rad($val))];
        case 'cos':   return ['result' => cos(deg2rad($val))];
        case 'tan':   return ['result' => tan(deg2rad($val))];
        case 'asin':  return ['result' => rad2deg(asin($val))];
        case 'acos':  return ['result' => rad2deg(acos($val))];
        case 'atan':  return ['result' => rad2deg(atan($val))];
        case 'sin_rad':  return ['result' => sin($val)];
        case 'cos_rad':  return ['result' => cos($val)];
        case 'tan_rad':  return ['result' => tan($val)];
        case 'sqrt':  return $val >= 0 ? ['result' => sqrt($val)] : ['error' => 'Cannot take sqrt of negative'];
        case 'log':   return $val > 0 ? ['result' => log10($val)] : ['error' => 'Domain error'];
        case 'ln':    return $val > 0 ? ['result' => log($val)] : ['error' => 'Domain error'];
        case 'pow2':  return ['result' => pow($val, 2)];
        case 'pow3':  return ['result' => pow($val, 3)];
        case 'inv':   return $val != 0 ? ['result' => 1 / $val] : ['error' => 'Division by zero'];
        case 'fact':  
            if ($val < 0 || $val != floor($val)) return ['error' => 'Factorial requires non-negative integer'];
            if ($val > 170) return ['error' => 'Number too large'];
            $f = 1; for ($i = 2; $i <= $val; $i++) $f *= $i;
            return ['result' => $f];
        case 'percent': return ['result' => $val / 100];
        case 'pi':    return ['result' => M_PI];
        case 'e':     return ['result' => M_E];
        case 'abs':   return ['result' => abs($val)];
        case 'evaluate': return safe_eval($extra ?? $value);
        default: return ['error' => 'Unknown action'];
    }
}

if ($action === 'evaluate') {
    echo json_encode(safe_eval($expression));
} else {
    echo json_encode(calculate_action($action, $expression, $expression));
}
