import { useEffect, useState } from "react";

function App() {
    const [message, setMessage] = useState("Loading...");

    useEffect(() => {
        fetch("http://localhost:5000/api/health")
            .then((response) => response.json())
            .then((data) => {
                setMessage(data.message);
            })
            .catch((error) => {
                console.error("Error:", error);
                setMessage("Failed to connect to server");
            });
    }, []);

    return (
        <div>
            <h1>Studex</h1>
            <p>{message}</p>
        </div>
    );
}

export default App;