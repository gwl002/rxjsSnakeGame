import React, { useState } from "react";
import { hot } from "react-hot-loader/root";


const App = () => {
    const [count, setCount] = useState(0);

    return (
        <div>
            <span>Greedy Snake</span>
            <p>
                <span>{count}</span>
            </p>
            <p>xx------y</p>
            <button onClick={() => { setCount(count => count + 1) }}>add Count</button>
        </div>
    )
}

export default hot(App);