import React, { useState, useEffect, memo, useRef, useReducer } from "react";
import { hot } from "react-hot-loader/root";
import { range, interval, zip, of, merge, fromEvent, NEVER } from "rxjs";
import { map, filter, scan, startWith, switchMap, tap, withLatestFrom, pluck, distinctUntilChanged, takeWhile, switchMapTo, finalize } from "rxjs/operators";
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


const createFood = (size, data) => {
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);
    if (data.some(item => item.x === x && item.y === y)) {
        return createFood(size, data);
    }
    return { x, y }
}

const checkGameOver = (x, y, data, size) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return true;
    if (data.slice(1).some(item => item.x === x && item.y === y)) return true;
    return false;
}

const App = () => {
    const size = 20;
    const [ref, { width }] = useMeasure();

    const itemWidth = width / size;

    const initialState = {
        isPaused: true,
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
        let data = [...initialState.data];
        let food = { ...initialState.food };

        const pauseClick$ = fromEvent(document.getElementById("pauseORresume"), "click");

        const reset$ = fromEvent(document.getElementById("reset"), "click").pipe(
            tap(x => {
                data = [...initialState.data];
                food = { ...initialState.food };
                setState(state => initialState)
            }),
            startWith("")
        )

        const pauseKey$ = fromEvent(document, "keyup").pipe(
            pluck("code"),
            filter((code) => code === "Space")
        )

        const pause$ = merge(pauseClick$, pauseKey$).pipe(
            scan((current, prev) => current ? false : true, true),
            tap((x) => {
                setState(state => Object.assign({}, state, { isPaused: x }))
            })
        );

        const dir$ = fromEvent(document, "keyup").pipe(
            pluck("key"),
            filter((key) => KEY_EVENTS_DIR.includes(key)),
            startWith("ArrowRight"),
            distinctUntilChanged(),
        )


        const snake$ = pause$.pipe(
            switchMap((isPaused) => isPaused ? NEVER : interval(300)),
            withLatestFrom(dir$),
            //不能反向
            scan((prev, [_, dir]) => {
                if (KEY_OPPOSITE[dir] === prev) {
                    return prev
                }
                return dir
            }, ""),
            map((dir) => {
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
                const isGameOver = checkGameOver(_x, _y, data, size);
                return {
                    data: [...data],
                    food: food,
                    isGameOver: isGameOver
                }
            }),
            takeWhile(_state => !_state.isGameOver, false),
            tap((_state) => {
                setState(state => Object.assign({}, state, _state))
            }),
            finalize(() => {
                setState(state => {
                    return {
                        ...state,
                        isGameOver: true
                    }
                })
            })
        )

        const game$ = reset$.pipe(
            switchMapTo(snake$)
        )

        game$.subscribe()

    }, [])

    return (
        <div className="container" ref={ref}>
            <Board winWidth={width} size={size} isGameOver={state.isGameOver} />
            <Snake itemWidth={itemWidth} data={state.data} />
            <Food itemWidth={itemWidth} food={state.food} />
            <div>
                <button id="pauseORresume">{
                    state.isPaused ? "START" : "PAUSE"
                }</button>
            </div>
            <div>
                <button id="reset">reset</button>
            </div>
        </div>
    )
}

const Food = ({ food, itemWidth }) => {
    if (!food) return null;

    return (
        <span
            className="boardItem"
            style={{
                position: "absolute",
                width: itemWidth,
                height: itemWidth,
                left: itemWidth * food.x,
                top: itemWidth * food.y,
                backgroundColor: "green"
            }}
        >
            <span></span>
        </span>
    )

}

const Snake = memo(({ data, itemWidth }) => {
    return (
        <>
            {data.map((item, index) =>
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
})

const GameOver = ({ isGameOver }) => {
    if (!isGameOver) return null;
    return (
        <h1 className="center">GAME OVER</h1>
    )
}

const Board = memo(({ winWidth, size, isGameOver }) => {
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
            <GameOver isGameOver={isGameOver} />
        </div>
    )
})

export default hot(App);