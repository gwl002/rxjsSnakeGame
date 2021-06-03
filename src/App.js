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

const INTERVAL_TIMES = [300, 200, 100, 80]


const createFood = (size, data) => {
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);
    if (data.some(item => item.x === x && item.y === y)) {
        return createFood(size, data);
    }
    return { x, y }
}

const checkGameOver = (snake) => {
    let head = snake[0];
    return snake.slice(1).some(item => item.x === head.x && item.y === head.y);
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

    const createGame = () => {
        const gameOver$ = new BehaviorSubject(false);

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

        const eatFood$ = new BehaviorSubject([]);

        const score$ = eatFood$.pipe(
            scan((score, _) => {
                return score + 1
            }, -1)
        )

        const food$ = eatFood$.pipe(
            map(snake => createFood(size, snake)),
            shareReplay(1),
        )

        const inteval$ = score$.pipe(
            filter(score => score % 5 === 0),
            map(score => {
                let level = Math.floor(score / 5);
                level = level >= 3 ? 3 : level;
                return INTERVAL_TIMES[level];
            }),
            distinctUntilChanged(),
            switchMap((time) => interval(time)),
        )

        const snake$ = pause$.pipe(
            switchMap((isPaused) => isPaused ? NEVER : inteval$),
            startWith("init"),
            withLatestFrom(dir$, food$),
            //不能反向
            scan((prev, [_, dir, food]) => {
                if (KEY_OPPOSITE[dir] === prev[0]) {
                    return [prev[0], food]
                }
                return [dir, food]
            }, []),
            scan((snake, [dir, food]) => {
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
                //吃到🍎,通知更新food$
                if (food.x === _x && food.y === _y) {
                    eatFood$.next(snake)
                } else {
                    snake.pop();
                }
                if (checkGameOver(snake)) {
                    gameOver$.next(true)
                }
                return [...snake];
            }, [{ x: 1, y: 1 }]),
        );

        const game$ = combineLatest([snake$, pause$, food$, score$, gameOver$]).pipe(
            takeWhile(([snake, isPaused, food, score, isGameOver]) => !isGameOver, true)
        )
        return game$;
    }


    const renderGame = ([snake, isPaused, food, score, isGameOver]) => {
        setState(state => {
            return {
                ...state,
                snake,
                isPaused,
                food,
                score,
                isGameOver
            }
        })
    }

    const startGame = () => {
        const reset$ = fromEvent(document.getElementById("reset"), "click");
        const game$ = merge(of("startGame"), reset$).pipe(
            switchMap(x => createGame()),
        )
        const sub = game$.subscribe(game => renderGame(game))
        return sub;
    }

    useEffect(() => {
        let sub = startGame();

        return () => {
            sub.unsubscribe();
        }
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