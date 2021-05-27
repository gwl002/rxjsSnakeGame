import React, { useState, useEffect, memo, useRef, useReducer } from "react";
import { hot } from "react-hot-loader/root";
import { range, interval, zip, of, merge, fromEvent, NEVER } from "rxjs";
import { map, filter, scan, startWith, switchMap, tap, withLatestFrom, pluck, distinctUntilChanged, mapTo, switchMapTo, takeUntil } from "rxjs/operators";
import "./styles/index.css";
import { useMeasure } from "react-use";

const KEY_EVENTS_DIR = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight"
]

const KEY_OPPOSITE = {
    ArrowUp: "ArrowDown",
    ArrowDown: "ArrowUp",
    ArrowRight: "ArrowLeft",
    ArrowLeft: "ArrowRight",
}


const App = () => {
    const size = 20;
    const [ref, { width }] = useMeasure();

    return (
        <div className="container" ref={ref}>
            <Board winWidth={width} size={size} />
            <Snake winWidth={width} size={size} />
            <div>
                <button id="pauseORresume">pause</button>
            </div>
            <div>
                <button id="reset">reset</button>
            </div>
        </div>
    )
}

const createFood = (size, data) => {
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);
    if (data.some(item => item.x === x && item.y === y)) {
        return createFood(size, data);
    }
    return { x, y }
}

const Snake = ({ winWidth, size }) => {
    const itemWidth = winWidth / size;

    const initialState = {
        isPaused: false,
        isGameOver: false,
        data: [
            {
                x: 1, y: 1
            }
        ],
        food: createFood(size, [{ x: 1, y: 1 }])
    }

    const [state, setState] = useState(initialState);

    useEffect(() => {
        let data = initialState.data;
        let food = initialState.food;

        const pauseClick$ = fromEvent(document.getElementById("pauseORresume"), "click");


        const reset$ = fromEvent(document.getElementById("reset"), "click").pipe(
            mapTo(initialState)
        )

        const pauseKey$ = fromEvent(document, "keydown").pipe(
            pluck("code"),
            filter((code) => code === "Space")
        )

        const pause$ = merge(pauseClick$, pauseKey$).pipe(
            scan((current, prev) => current ? false : true, true),
            tap((x) => {
                setState(state => {...state, isPaused: x})
            })
        );



const dir$ = fromEvent(document, "keydown").pipe(
    pluck("key"),
    filter((key) => KEY_EVENTS_DIR.includes(key)),
    startWith("ArrowRight"),
    distinctUntilChanged(),
    scan((prev, cur) => {
        if (KEY_OPPOSITE[cur] === prev) {
            return prev
        }
        return cur
    }, "")
)


const snake$ = pause$.pipe(
    switchMap((isPaused) => isPaused ? NEVER : interval(300)),
    withLatestFrom(dir$),
    map(([_, dir]) => {
        let head = data[0];
        let _x = head.x;
        let _y = head.y;

        switch (dir) {
            case "ArrowRight":
                _x += 1;
                break;
            case "ArrowLeft":
                _x -= 1;
                break;
            case "ArrowUp":
                _y -= 1;
                break;
            case "ArrowDown":
                _y += 1
                break;
        }
        data.unshift({ x: _x, y: _y })
        if (food.x === _x && food.y === _y) {
            food = createFood(size, data);
        } else {
            data.pop();
        }
        return {
            data: data,
            food: food
        }
    }),
    tap((_state) => {
        setState(state => Object.assign({}, state, _state))
    })
)


    }, [])


return (
    <>
        {state.data.map((item, index) =>
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

        {state.food && <span
            className="boardItem"
            style={{
                position: "absolute",
                width: itemWidth,
                height: itemWidth,
                left: itemWidth * state.food.x,
                top: itemWidth * state.food.y,
                backgroundColor: "green"
            }}
        >
            <span></span>
        </span>}
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