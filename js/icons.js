// 線條圖示（2026-11-22 介面改版第二批）
// 圖示來自 Lucide（https://lucide.dev，ISC 授權，授權全文見 js/icons-LICENSE.txt）；tick 是自己畫的帳簿式對帳勾（招牌）。
// 只打包用到的圖示，離線也能用。ic('名字') 回傳行內 SVG；跟文字同色（currentColor）。
const ICP={
"wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>",
"compass": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\"/>",
"landmark": "<path d=\"M10 18v-7\"/><path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\"/><path d=\"M14 18v-7\"/><path d=\"M18 18v-7\"/><path d=\"M3 22h18\"/><path d=\"M6 18v-7\"/>",
"coins": "<path d=\"M13.744 17.736a6 6 0 1 1-7.48-7.48\"/><path d=\"M15 6h1v4\"/><path d=\"m6.134 14.768.866-.5 2 3.464\"/><circle cx=\"16\" cy=\"8\" r=\"6\"/>",
"calendar-check": "<path d=\"M8 2v3\"/><path d=\"M16 2v3\"/><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18\"/><path d=\"m9 15 2 2 4-4\"/>",
"calendar": "<path d=\"M8 2v3\"/><path d=\"M16 2v3\"/><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18\"/>",
"calendar-range": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v3\"/><path d=\"M3 9h18\"/><path d=\"M8 2v3\"/><path d=\"M17 13h-6\"/><path d=\"M13 17H7\"/><path d=\"M7 13h.01\"/><path d=\"M17 17h.01\"/>",
"clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M12 11h4\"/><path d=\"M12 16h4\"/><path d=\"M8 11h.01\"/><path d=\"M8 16h.01\"/>",
"clipboard-copy": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v4\"/><path d=\"M21 14H11\"/><path d=\"m15 10-4 4 4 4\"/>",
"clipboard-paste": "<path d=\"M11 14h10\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v1.344\"/><path d=\"m17 18 4-4-4-4\"/><path d=\"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113\"/><rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/>",
"bot": "<path d=\"M12 8V4H8\"/><rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\"/><path d=\"M2 14h2\"/><path d=\"M20 14h2\"/><path d=\"M15 13v2\"/><path d=\"M9 13v2\"/>",
"shield": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/>",
"shield-exclamation-point": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"M12 8v4\"/><path d=\"M12 16h.01\"/>",
"pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/><path d=\"m15 5 4 4\"/>",
"pen-line": "<path d=\"M13 21h8\"/><path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/>",
"search": "<path d=\"m21 21-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/>",
"eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
"library": "<path d=\"m16 6 4 14\"/><path d=\"M12 6v14\"/><path d=\"M8 8v12\"/><path d=\"M4 4v16\"/>",
"notebook-pen": "<path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\"/><path d=\"M2 6h4\"/><path d=\"M2 10h4\"/><path d=\"M2 14h4\"/><path d=\"M2 18h4\"/><path d=\"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"/>",
"target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
"bell": "<path d=\"M10.268 21a2 2 0 0 0 3.464 0\"/><path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\"/>",
"refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>",
"repeat": "<path d=\"m17 2 4 4-4 4\"/><path d=\"M3 11v-1a4 4 0 0 1 4-4h14\"/><path d=\"m7 22-4-4 4-4\"/><path d=\"M21 13v1a4 4 0 0 1-4 4H3\"/>",
"radio": "<path d=\"M16.247 7.761a6 6 0 0 1 0 8.478\"/><path d=\"M19.075 4.933a10 10 0 0 1 0 14.134\"/><path d=\"M4.925 19.067a10 10 0 0 1 0-14.134\"/><path d=\"M7.753 16.239a6 6 0 0 1 0-8.478\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
"download": "<path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/>",
"upload": "<path d=\"M12 3v12\"/><path d=\"m17 8-5-5-5 5\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/>",
"share": "<path d=\"M12 2v13\"/><path d=\"m16 6-4-4-4 4\"/><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"/>",
"briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"/>",
"pin": "<path d=\"M12 17v5\"/><path d=\"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z\"/>",
"zap": "<path d=\"M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z\"/>",
"save": "<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\"/><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\"/><path d=\"M7 3v4a1 1 0 0 0 1 1h7\"/>",
"lightbulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>",
"settings": "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
"package": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><polyline points=\"3.29 7 12 12 20.71 7\"/><path d=\"m7.5 4.27 9 5.15\"/>",
"notebook-text": "<path d=\"M2 6h4\"/><path d=\"M2 10h4\"/><path d=\"M2 14h4\"/><path d=\"M2 18h4\"/><rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\"/><path d=\"M9.5 8h5\"/><path d=\"M9.5 12H16\"/><path d=\"M9.5 16H14\"/>",
"scroll-text": "<path d=\"M15 12h-5\"/><path d=\"M15 8h-5\"/><path d=\"M19 17V5a2 2 0 0 0-2-2H4\"/><path d=\"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3\"/>",
"door-open": "<path d=\"M10 21H2\"/><path d=\"M10 3H7a2 2 0 00-2 2v16\"/><path d=\"M14 12h.01\"/><path d=\"M19 21V5a2 2 0 00-1.675-1.974l-6.163-1.013A1 1 0 0010 3v18a1 1 0 001.124.992z\"/><path d=\"M22 21h-3\"/>",
"folder-open": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>",
"life-buoy": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m4.93 4.93 4.24 4.24\"/><path d=\"m14.83 9.17 4.24-4.24\"/><path d=\"m14.83 14.83 4.24 4.24\"/><path d=\"m9.17 14.83-4.24 4.24\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/>",
"chart-pie": "<path d=\"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z\"/><path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"/>",
"receipt": "<path d=\"M12 17V7\"/><path d=\"M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8\"/><path d=\"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z\"/>",
"telescope": "<path d=\"m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44\"/><path d=\"m13.56 11.747 4.332-.924\"/><path d=\"m16 21-3.105-6.21\"/><path d=\"M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z\"/><path d=\"m6.158 8.633 1.114 4.456\"/><path d=\"m8 21 3.105-6.21\"/><circle cx=\"12\" cy=\"13\" r=\"2\"/>",
"lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
"lock-open": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 9.9-1\"/>",
"ruler": "<path d=\"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z\"/><path d=\"m14.5 12.5 2-2\"/><path d=\"m11.5 9.5 2-2\"/><path d=\"m8.5 6.5 2-2\"/><path d=\"m17.5 15.5 2-2\"/>",
"arrow-left-right": "<path d=\"M8 3 4 7l4 4\"/><path d=\"M4 7h16\"/><path d=\"m16 21 4-4-4-4\"/><path d=\"M20 17H4\"/>",
"trash": "<path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/><path d=\"M3 6h18\"/><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>",
"book-open": "<path d=\"M12 5v16\"/><path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\"/>",
"play": "<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\"/>",
"tag": "<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>",
"scale": "<path d=\"M12 3v18\"/><path d=\"m19 8 3 8a5 5 0 0 1-6 0zV7\"/><path d=\"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1\"/><path d=\"m5 8 3 8a5 5 0 0 1-6 0zV7\"/><path d=\"M7 21h10\"/>",
"building": "<path d=\"M12 10h.01\"/><path d=\"M12 14h.01\"/><path d=\"M12 6h.01\"/><path d=\"M16 10h.01\"/><path d=\"M16 14h.01\"/><path d=\"M16 6h.01\"/><path d=\"M8 10h.01\"/><path d=\"M8 14h.01\"/><path d=\"M8 6h.01\"/><path d=\"M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\"/><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/>",
"clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>",
"globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>",
"undo-2": "<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\"/>",
"arrow-up-down": "<path d=\"m21 16-4 4-4-4\"/><path d=\"M17 20V4\"/><path d=\"m3 8 4-4 4 4\"/><path d=\"M7 4v16\"/>",
"x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
"ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M4.929 4.929 19.07 19.071\"/>",
"triangle-exclamation-point": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
"hourglass": "<path d=\"M5 22h14\"/><path d=\"M5 2h14\"/><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"/><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"/>",
"circle-question-mark": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5\"/><path d=\"M12 17h.01\"/>",
"circle-pause": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"10\" x2=\"10\" y1=\"15\" y2=\"9\"/><line x1=\"14\" x2=\"14\" y1=\"15\" y2=\"9\"/>",
"circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m16 9-5.5 5.5L8 12\"/>",
"circle-dot": "<circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"10\"/>",
"trending-down": "<path d=\"M16 17h6v-6\"/><path d=\"m22 17-8.5-8.5-5 5L2 7\"/>",
"trending-up": "<path d=\"M16 7h6v6\"/><path d=\"m22 7-8.5 8.5-5-5L2 17\"/>",
"arrow-down": "<path d=\"M12 5v14\"/><path d=\"m19 12-7 7-7-7\"/>",
"arrow-up": "<path d=\"m5 12 7-7 7 7\"/><path d=\"M12 19V5\"/>",
"hand": "<path d=\"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2\"/><path d=\"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2\"/><path d=\"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8\"/><path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\"/>",
"smartphone": "<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M12 18h.01\"/>",
"square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/>",
"files": "<path d=\"M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8\"/><path d=\"M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z\"/><path d=\"M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1\"/>",
"swords": "<path d=\"m13 19 6-6\"/><path d=\"M14.5 17.5 3.586 6.586A2 2 0 013 5.172V3h2.172a2 2 0 011.414.586L17.5 14.5\"/><path d=\"m14.828 6.172 2.586-2.586A2 2 0 0118.828 3H21v2.172a2 2 0 01-.586 1.414l-2.586 2.586\"/><path d=\"m16 16 4 4\"/><path d=\"m19 21 2-2\"/><path d=\"m5 14 4 4\"/><path d=\"m5 21-2-2\"/><path d=\"M7.5 16.5 4 20\"/>",
"chart-line": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"m19 9-5 5-4-4-3 3\"/>",
"rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>",
"moon": "<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\"/>",
"sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>",
"tick": "<path d=\"M3.6 12.9c1.6.7 3.1 2.1 4.8 4.4 3.3-5.3 7-9.3 12-12.6\"/>"
};
function ic(n,c){const p=ICP[n];if(!p)return'';return`<svg class="i${n=='tick'?' i-tick':''}${c?' '+c:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${n=='tick'?2.2:1.75}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`}

// ---------- emoji 換圖示 ----------
// 畫面上的 emoji 在顯示時換成線條圖示：原始文字（複製給 AI、晨報同步、匯出檔）完全不變。
// 不處理：textarea、pre、code、script、style、可編輯區；下拉選單（option）放不了圖示，只拿掉 emoji。
// 狀態類（勾、叉、禁止、警告…）在一般文字裡會帶顏色；放在本來就有顏色的地方（例如警告文字）就跟著那個顏色。
const EMI={'✅':['tick','ok'],'✓':['tick','ok'],'✔':['tick','ok'],'☑':['tick','ok'],'❌':['x','wn'],'✗':['x','wn'],'⛔':['ban','bad'],'🚫':['ban','bad'],
 '⚠':['triangle-exclamation-point','wn'],'⏳':['hourglass','mut'],'❔':['circle-question-mark','mut'],'⏸':['circle-pause','mut'],
 '🔴':['dot','bad'],'🟠':['dot','wn'],'🟡':['dot','mut'],'🟢':['circle-check','ok'],'🔵':['circle-dot','mut'],'📉':['trending-down','dn'],'📈':['trending-up'],
 '📊':['wallet'],'🧭':['compass'],'💰':[r=>/^\s*信貸/.test(r)?'landmark':'coins'],'📅':[r=>/^\s*明天/.test(r)?'calendar-check':'calendar'],'🗓':['calendar-range'],
 '📋':[r=>/^\s*(問 ?AI|複製)/.test(r)?'clipboard-copy':'clipboard-list'],'📥':['clipboard-paste'],'🤖':['bot'],'🛡':['shield'],'🧯':['shield-exclamation-point'],
 '✏':['pencil'],'✎':['pencil'],'✍':['pen-line'],'🔍':['search'],'🔎':['search'],'👀':['eye'],'📚':['library'],'📝':['notebook-pen'],'🎯':['target'],'🔔':['bell'],
 '🔄':['refresh-cw'],'🔁':['repeat'],'📡':['radio'],'⬇':['download'],'⬆':['upload'],'📤':['share'],'💼':['briefcase'],'📌':['pin'],'⚡':['zap'],'💾':['save'],'💡':['lightbulb'],
 '⚙':['settings'],'📦':['package'],'📒':['notebook-text'],'📜':['scroll-text'],'🚪':['door-open'],'📂':['folder-open'],'🛟':['life-buoy'],'🧩':['chart-pie'],'🧾':['receipt'],
 '🔭':['telescope'],'🔒':['lock'],'🔓':['lock-open'],'📏':['ruler'],'💱':['arrow-left-right'],'🗑':['trash'],'📖':['book-open'],'🚀':['play'],'🏷':['tag'],'⚖':['scale'],
 '🏦':['building'],'🏛':['landmark'],'🕘':['clock'],'🌐':['globe'],'↩':['undo-2'],'↺':['rotate-ccw'],'↕':['arrow-up-down'],'✕':['x'],'🔻':['arrow-down'],'🔺':['arrow-up'],
 '✋':['hand'],'📱':['smartphone'],'⬜':['square'],'📑':['files'],'⚔':['swords'],'🔮':['trending-up'],'👉':['→']};
const EMI_RE=new RegExp('\\p{Regional_Indicator}{2}\\s?|(?:'+Object.keys(EMI).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\uFE0F?','gu');
// 第二批分三次上線：先換這些範圍（2a：標題列、資產頁、資產頁開出來的視窗）
const EMI_ROOTS='.hdr,.wsw,#pgA,#twFab,#usFab,#asOv,#toast';
const EMI_SKIP='script,style,textarea,pre,code,[contenteditable],.noic';
let EMI_TX=null;
function emiHtml(m,rest,par){const k=m.replace(/️/g,'');if(/\p{Regional_Indicator}/u.test(k))return'';const d=EMI[k];if(!d)return null;
 let n=d[0];if(typeof n=='function')n=n(rest);if(n=='→')return'→';
 // 狀態色：父元素是一般文字顏色才上色，否則跟著父元素
 let c=d[1]||'';if(c&&par){try{if(!EMI_TX)EMI_TX=getComputedStyle(document.body).color;if(getComputedStyle(par).color!=EMI_TX)c=''}catch(e){}}
 const cl=c?'i-'+c:'';
 return n=='dot'?`<span class="idot ${cl}" data-e="${k}" aria-hidden="true"></span>`:ic(n,cl).replace('<svg ',`<svg data-e="${k}" `)}
function emiNode(t){const s=t.nodeValue;if(!s)return;EMI_RE.lastIndex=0;if(!EMI_RE.test(s))return;const par=t.parentElement;if(!par||par.closest(EMI_SKIP))return;
 if(par.closest('option,select')){t.nodeValue=s.replace(EMI_RE,m=>{const k=m.replace(/️/g,'');return EMI[k]||/\p{Regional_Indicator}/u.test(k)?'':m}).replace(/^\s+/,'');return}
 let h='',last=0,any=0;EMI_RE.lastIndex=0;let m;const esc_=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 while((m=EMI_RE.exec(s))){const r=emiHtml(m[0],s.slice(m.index+m[0].length),par);if(r==null)continue;h+=esc_(s.slice(last,m.index))+r;last=m.index+m[0].length;any=1}
 if(!any)return;h+=esc_(s.slice(last));
 // 父元素是 flex／grid 時包成一個 span，避免圖示和文字被拆成兩格
 try{if(/flex|grid/.test(getComputedStyle(par).display))h=`<span>${h}</span>`}catch(e){}
const tp=document.createElement('template');tp.innerHTML=h;t.replaceWith(tp.content)}
function emiWalk(root){if(!root)return;if(root.nodeType==3){emiNode(root);return}if(root.nodeType!=1)return;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),L=[];let n;while((n=w.nextNode()))L.push(n);L.forEach(emiNode)}
function emiIn(n){const e=n.nodeType==1?n:n.parentElement;return!!(e&&e.closest(EMI_ROOTS))}
function emiStart(){document.querySelectorAll(EMI_ROOTS).forEach(emiWalk);
 new MutationObserver(R=>{for(const r of R){if(r.type=='characterData'){if(emiIn(r.target))emiNode(r.target);continue}
  for(const n of r.addedNodes){if(n.nodeType==1&&n.matches&&n.matches(EMI_ROOTS))emiWalk(n);else if(emiIn(n))emiWalk(n)}}}).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',emiStart);else emiStart();
