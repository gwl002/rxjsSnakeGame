import React, { useState, useEffect, memo, useRef } from "react";
import { hot } from "react-hot-loader/root";
import { range, interval, zip } from "rxjs";
import { map, filter } from "rxjs/operators";
import "./styles/index.css";
import { useMeasure } from "react-use";

const App = () => {
    const size = 20;
    const [ref, { width }] = useMeasure();

    return (
        <div className="container" ref={ref}>
            <Board winWidth={width} size={size} />
            <Snake winWidth={width} size={size} />
        </div>
    )
}

const Snake = ({ winWidth, size }) => {
    const itemWidth = winWidth / size;

    const [state, setState] = useState(null);
    const updateRef = useRef();

    const data = useRef([{ x: 1, y: 1 }])

    const update = () => {
        setState({});
        updateRef.current = window.requestAnimationFrame(update);
    }

    const startGame = () => {
        setInterval(() => {
            let list = data.current;
            let head = list[0];
            data.current = [{ x: head.x + 1, y: head.y }]
        }, 1000)
    }

    useEffect(() => {
        // startGame();
    }, [])

    useEffect(() => {
        updateRef.current = window.requestAnimationFrame(update);
        return () => {
            window.cancelAnimationFrame(updateRef.current);
        }
    }, [])

    return (
        <>
            {data.current.map((item, index) =>
                <span
                    key={index}
                    className="boardItem"
                    style={{
                        position: "absolute",
                        width: itemWidth,
                        height: itemWidth,
                        left: itemWidth * item.x,
                        top: itemWidth * item.y,
                        backgroundColor: "red"
                    }}
                >
                    <span></span>
                </span>
            )}
        </>
    )
}

const Board = memo(({ winWidth, size }) => {
    const itemWidth = winWidth / size;

    const Row = ({ rowIndex }) => {
        return (
            <div className="row">
                {
                    Array(size).fill().map((item, index) => (
                        <span key={index} className="boardItem" style={{ width: itemWidth, height: itemWidth }}>
                            <span></span>
                        </span>
                    ))
                }
            </div>
        )
    }

    return (
        <div id="board">
            {
                Array(size).fill().map((item, index) => <Row key={index} />)
            }
        </div>
    )
})

export default hot(App);