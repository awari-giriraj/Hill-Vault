import { useState, useRef, useEffect } from 'react';
import useStore from '../store';
import { FaSave, FaTimes, FaEraser, FaPalette, FaUndo, FaRedo } from 'react-icons/fa';
import './Sketchpad.css';

function Sketchpad() {
  const { setCurrentView } = useStore();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen');
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const colors = [
    '#000000', '#FFFFFF', '#EF4444', '#F59E0B', '#10B981',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F97316'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state
    saveState();
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = history[historyStep - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      setHistoryStep(historyStep - 1);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = history[historyStep + 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      setHistoryStep(historyStep + 1);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = brushSize * 3;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const clearCanvas = () => {
    if (confirm('Clear the entire canvas?')) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');

    // For now, just download the image
    const link = document.createElement('a');
    link.download = `sketch-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    alert('Sketch saved to downloads!');
    setCurrentView('dashboard');
  };

  const handleCancel = () => {
    if (confirm('Discard this sketch?')) {
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="sketchpad">
      <div className="sketchpad-toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => setTool('pen')}
            title="Pen"
          >
            <FaPalette />
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            <FaEraser />
          </button>
        </div>

        <div className="tool-group">
          <label className="tool-label">Brush Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="brush-slider"
          />
          <span className="brush-size-value">{brushSize}px</span>
        </div>

        <div className="tool-group">
          <label className="tool-label">Color:</label>
          <div className="color-palette">
            {colors.map(c => (
              <button
                key={c}
                className={`color-btn ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
              title="Custom color"
            />
          </div>
        </div>

        <div className="tool-group">
          <button className="tool-btn" onClick={undo} disabled={historyStep <= 0} title="Undo">
            <FaUndo />
          </button>
          <button className="tool-btn" onClick={redo} disabled={historyStep >= history.length - 1} title="Redo">
            <FaRedo />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={clearCanvas}>
            Clear
          </button>
        </div>

        <div className="tool-group ml-auto">
          <button className="btn btn-secondary" onClick={handleCancel}>
            <FaTimes /> Cancel
          </button>
          <button className="btn btn-success" onClick={handleSave}>
            <FaSave /> Save Sketch
          </button>
        </div>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
}

export default Sketchpad;
