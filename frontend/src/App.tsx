import { Routes, Route, Link } from 'react-router-dom';
import Game from './Game';
import Login from './Login';
import SignUp from './signUp'; // Import the SignUp component
import DeleteUser from "./delete";

function App() {
    return (
        <div>
            <nav style={{ marginBottom: '1rem' }}>
                <Link to="/">Home</Link> |{' '}
                <Link to="/game">Game</Link> |{' '}
                <Link to="/signUp">Sign Up</Link> {/* Add a link to the SignUp page */}
            </nav>

            <Routes>
                <Route path="/logIn" element={<Login />} />
                <Route path="/game" element={<Game />} />
                <Route path="/signUp" element={<SignUp />} /> {/* Add the SignUp route */}
                <Route path="/delete" element={<DeleteUser />} /> {/* Add the DeleteUser route */}
            </Routes>
        </div>
    );
}

export default App;