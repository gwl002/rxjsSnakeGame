import React, { useState, useEffect, memo, useRef, useReducer } from "react";
import { hot } from "react-hot-loader/root";
import { interval, of, merge, fromEvent, NEVER, BehaviorSubject, combineLatest, Subject, asyncScheduler } from "rxjs";
import { map, filter, scan, startWith, switchMap, tap, withLatestFrom, pluck, distinctUntilChanged, takeWhile, switchMapTo, finalize, share, skip, shareReplay, observeOn } from "rxjs/operators";
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

const INTERVAL_TIMES = [300, 200, 100]


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
        isGameOver: false,
        score: 0,
        snake: [

        ],
        food: null,
        isPaused: true
    }

    const [state, setState] = useState(initialState);

    useEffect(() => {
        const initFood = createFood(size, []);

        const dir$ = fromEvent(document, "keydown").pipe(
            pluck("key"),
            filter((key) => KEY_EVENTS_DIR.includes(key)),
            startWith("ArrowRight"),
            distinctUntilChanged(),
        );

        const pauseClick$ = fromEvent(document.getElementById("pauseORresume"), "click");
        const pauseKey$ = fromEvent(document, "keydown").pipe(
            pluck("code"),
            filter((code) => code === "Space")
        )
        const pause$ = merge(pauseClick$, pauseKey$).pipe(
            startWith(true),
            scan((current, prev) => current ? false : true, false)
        )

        const eatFood$ = new BehaviorSubject(0);

        const score$ = eatFood$.pipe(
            scan((score, _) => {
                return score + 1
            }, -1),
        )

        const snake$ = pause$.pipe(
            switchMap((isPaused) => isPaused ? NEVER : interval(300)),
            startWith("init"),
            withLatestFrom(dir$, score$),
            //不能反向
            scan((prev, [_, dir, score]) => {
                if (KEY_OPPOSITE[dir] === prev[0]) {
                    return [prev[0], score]
                }
                return [dir, score]
            }, []),
            scan((snake, [dir, score]) => {
                const eatFood = snake.length <= score
                let head = snake[0];
                let _x = head.x;
                let _y = head.y;
                switch (dir) {
                    case "ArrowRight":
                        _x = _x >= size - 1 ? 0 : _x + 1;
                        break;
                    case "ArrowLeft":
                        _x = _x <= 0 ? size - 1 : _x - 1;
                        break;
                    case "ArrowUp":
                        _y = _y <= 0 ? size - 1 : _y - 1;
                        break;
                    case "ArrowDown":
                        _y = _y >= size - 1 ? 0 : _y + 1;
                        break;
                }
                snake.unshift({ x: _x, y: _y });
                if (!eatFood) {
                    snake.pop();
                }
                return [...snake];
            }, [{ x: 1, y: 1 }]),
            shareReplay(1),
        );

        const food$ = snake$.pipe(
            scan((food, snake) => {
                let head = snake[0];
                if (head.x === food.x && head.y === food.y) {
                    return createFood(size, snake)
                }
                return food;
            }, initFood),
            startWith(initFood),
            distinctUntilChanged(),
            shareReplay(1)
        )

        const game$ = combineLatest([snake$, pause$, food$, score$])

        food$.subscribe(x => {
            eatFood$.next(1)
        })

        game$.subscribe(([snake, isPaused, food, score]) => {
            console.log("startGame")
            setState(state => {
                return {
                    ...state,
                    snake,
                    isPaused,
                    food,
                    score
                }
            })
        })

    }, [])


    return (
        <div className="container" ref={ref}>
            <Board winWidth={width} size={size} isGameOver={state.isGameOver} />
            <Snake itemWidth={itemWidth} data={state.snake} />
            <Food itemWidth={itemWidth} food={state.food} />
            <div>
                <button id="pauseORresume">{
                    state.isPaused ? "START" : "PAUSE"
                }</button>
            </div>
            <div>
                <button id="reset">reset</button>
            </div>
            <span>{state.score}</span>
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
                    // key={`${item.x}-${item.y}`}
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