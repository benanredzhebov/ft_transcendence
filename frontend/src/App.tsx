import { Routes, Route, Link } from 'react-router-dom';
import { GameCanvas } from './Game';
import Login from './Login';

function App() {
  return (
    <div>
      <nav style={{ marginBottom: '1rem' }}>
        <Link to="/">Home</Link> |{' '}
        <Link to="/game">Game</Link> |{' '}
      </nav>
      

      <Routes>
	  	<Route path="/" element={<Login />} />
        <Route path="/game" element={<GameCanvas />} />
      </Routes>
    </div>
  );
}

export default App;
