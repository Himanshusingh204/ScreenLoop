// AnnotationCanvas.jsx — Real-time screen drawing & annotation overlay
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PencilSimple, Eraser, Palette, Trash, X } from './icons';

const PALETTE = ['#ff3b30', '#00e5ff', '#ffd600', '#00e676', '#e040fb', '#ffffff'];

/**
 * @param {object} props
 * @param {import('socket.io-client').Socket} props.socket
 * @param {boolean} props.isHost
 * @param {string} props.roomId
 * @param {boolean} props.active - whether drawing mode is enabled
 * @param {Function} props.onToggleActive
 */
export function AnnotationCanvas({ socket, isHost, roomId, active, onToggleActive }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);

  const [color, setColor] = useState('#ff3b30');
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'

  // Resize canvas to match its container resolution
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== canvas.width || rect.height !== canvas.height) {
      // Save current content before resize
      const ctx = canvas.getContext('2d');
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = rect.width;
      canvas.height = rect.height;

      // Restore content
      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Draw a normalized segment onto the canvas
  const drawSegment = useCallback((segment) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { fromX, fromY, toX, toY, color, width, tool } = segment;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = width * 3;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = width * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
    }

    ctx.beginPath();
    ctx.moveTo(fromX * canvas.width, fromY * canvas.height);
    ctx.lineTo(toX * canvas.width, toY * canvas.height);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Listen for remote drawing events from host
  useEffect(() => {
    if (!socket) return;

    const onRemoteDraw = ({ stroke }) => {
      if (Array.isArray(stroke)) {
        stroke.forEach((segment) => drawSegment(segment));
      } else if (stroke) {
        drawSegment(stroke);
      }
    };

    const onRemoteClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('sync:draw', onRemoteDraw);
    socket.on('sync:clear-draw', onRemoteClear);

    return () => {
      socket.off('sync:draw', onRemoteDraw);
      socket.off('sync:clear-draw', onRemoteClear);
    };
  }, [socket, drawSegment]);

  // Host: Clear drawing canvas
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (socket && isHost) {
      socket.emit('sync:clear-draw', { roomId });
    }
  }, [socket, isHost, roomId]);

  // Drawing event handlers (Host only)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const handleStart = (e) => {
    if (!active || !isHost) return;
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    currentPathRef.current = [coords];
  };

  const handleMove = (e) => {
    if (!active || !isHost || !isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    const prevCoords = currentPathRef.current[currentPathRef.current.length - 1];

    if (prevCoords) {
      const segment = {
        fromX: prevCoords.x,
        fromY: prevCoords.y,
        toX: coords.x,
        toY: coords.y,
        color,
        width: lineWidth,
        tool,
      };

      drawSegment(segment);

      if (socket) {
        socket.emit('sync:draw', { roomId, stroke: segment });
      }
    }

    currentPathRef.current.push(coords);
  };

  const handleEnd = () => {
    if (!active || !isHost) return;
    isDrawingRef.current = false;
    currentPathRef.current = [];
  };

  return (
    <div className={`annotation-layer ${active ? 'active' : ''}`}>
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {/* Host Toolbar for Drawing */}
      {isHost && active && (
        <div className="annotation-toolbar animate-slide-down">
          <div className="annotation-tools">
            <button
              className={`annot-btn ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
              title="Pen Tool"
              aria-pressed={tool === 'pen'}
              aria-label="Pen tool"
            >
              <PencilSimple size={14} /> Pen
            </button>
            <button
              className={`annot-btn ${tool === 'highlighter' ? 'active' : ''}`}
              onClick={() => setTool('highlighter')}
              title="Highlighter"
              aria-pressed={tool === 'highlighter'}
              aria-label="Highlighter tool"
            >
              <Palette size={14} /> Highlight
            </button>
            <button
              className={`annot-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
              title="Eraser"
              aria-pressed={tool === 'eraser'}
              aria-label="Eraser tool"
            >
              <Eraser size={14} /> Eraser
            </button>
          </div>

          <div className="annotation-palette">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`color-dot ${color === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
                title={`Color ${c}`}
              />
            ))}
          </div>

          <div className="annotation-actions">
            <button className="annot-action-btn" onClick={handleClear} title="Clear all drawings">
              <Trash size={14} /> Clear
            </button>
            <button className="annot-close-btn" onClick={onToggleActive} title="Exit Draw Mode">
              <X size={14} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
