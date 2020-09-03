//先定义三个状态
const PENDING = 'pending';
const FULLFILLED = 'fullfilled';
const REJECTED = 'rejected';

class MyPromise {
    constructor(fn) {
        this.status = PENDING;      //初状态为pending
        this.value = null;          //初始化value
        this.reason = null;         //初始化reason

        //定义两个数组暂存fn成功或失败的回调
        this.onFullfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        //定义resolve方法
        this.resolve = (value) => {
            if(this.status === PENDING) {
                this.status = FULLFILLED;
                this.value = value;
                //fn状态由pending变成fullfilled，执行then里面的onFullfilled回调函数
                this.onFullfilledCallbacks.forEach(callback => {
                    callback(this.value);
                })
            }
        }

        //定义rejecte方法
        this.reject = (reason) => {
            if(this.status === PENDING) {
                this.status = REJECTED;
                this.reason = reason;
                //fn状态由pending变成rejected，执行then里面的onRejected回调函数
                this.onRejectedCallbacks.forEach(callback => {
                    callback(this.reason);
                })
            }
        }

        //将resolve和reject作为参数调用传进来的参数，加上try...catch，一旦发生错误就调用reject
        try {
            fn(this.resolve, this.reject);
        } catch(error) {
            this.reject(error);
        }

        this.then = this.then.bind(this);
        this.catch = this.catch.bind(this);
        this.finally = this.finally.bind(this);
        this.resolve = this.resolve.bind(this);
        this.reject = this.reject.bind(this);
        this.all = this.all.bind(this);
        this.race = this.race.bind(this);
        this.allSettled = this.allSettled.bind(this);
        this.any = this.any.bind(this);
    }

    then(onFullfilled, onRejected) {
        //如果onFulfilled不是函数，给一个默认函数，返回value
        let realOnFullfilled = onFullfilled;
        if(typeof realOnFullfilled !== 'function') {
            realOnFullfilled = (value) => value;
        }

        //如果onRejected不是函数，给一个默认函数，返回reason的error
        let realOnRejected = onRejected;
        if(typeof realOnRejected !== 'function') {
            realOnRejected = (reason) => {
                throw reason;
            }
        }

        //如果还是PENDING状态，也不能直接保存回调方法了，需要包一层来捕获错误
        if(this.status === PENDING) {
            // this.onFullfilledCallbacks.push(realOnFullfilled);
            // this.onRejectedCallbacks.push(realOnRejected);
            let promise2 = new MyPromise((resolve, reject) => {
                this.onFullfilledCallbacks.push(() => {
                    //这里加setTimeout
                    setTimeout(() => {
                        try {
                            if(typeof onFullfilled !== 'function') {
                                resolve(this.value);
                            } else {
                                let x = realOnFullfilled(this.value);
                                resolvePromise(promise2, x, resolve, reject);   // 调用Promise 解决过程
                            }
                        } catch(error) {
                            reject(error);
                        }
                    }, 0);
                });
                this.onRejectedCallbacks.push(() => {
                    //这里加setTimeout
                    setTimeout(() => {
                        try {
                            if(typeof onRejected !== 'function') {
                                reject(this.reason);
                            } else {
                                let x = realOnRejected(this.reason);
                                resolvePromise(promise2, x, resolve, reject);   // 调用Promise 解决过程
                            }
                        } catch(error) {
                            reject(error);
                        }
                    }, 0);
                });
            });

            return promise2;
        }

        //fullfilled状态则会调用onFullfilled函数
        if(this.status === FULLFILLED) {
            let promise2 = new MyPromise((resolve, reject) => {
                //这里要添加setTimeout，保证回调在下一轮事件循环开始的时候执行
                setTimeout(() => {
                    //这里不能简单的调用realOnFullfilled函数了，要使用try...catch语句块包起来，如果有错就reject
                    try {
                        //加一层onFullfilled是不是函数的判断
                        if(typeof onFullfilled !== 'function') {
                            resolve(this.value);        //返回相同的值
                        } else {
                            let x = realOnFullfilled(this.value);           //x是执行OnFullfilled函数的返回值
                            resolvePromise(promise2, x, resolve, reject);   // 调用Promise 解决过程
                        }
                    } catch(error) {
                        reject(error);
                    }
                }, 0);
            });

            return promise2;
        }

        //rejected状态则会调用onRejected函数
        if(this.status === REJECTED) {
            let promise2 = new MyPromise((resolve, reject) => {
                //这里要添加setTimeout，保证回调在下一轮事件循环开始的时候执行
                setTimeout(() => {
                    //这里不能简单的调用realOnRejected函数了，要使用try...catch语句块包起来，如果有错就reject
                    try {
                        //加一层onRejected是不是函数的判断
                        if(typeof onRejected !== 'function') {
                            reject(this.reason);
                        } else {
                            let x = realOnRejected(this.reason);           //x是执行OnRejected函数的返回值
                            resolvePromise(promise2, x, resolve, reject);   // 调用Promise 解决过程
                        }
                    } catch(error) {
                        reject(error);
                    }
                }, 0);
            });

            return promise2;
        }
    }

    resolve(parameter) {
        if(parameter instanceof MyPromise) {
            //如果是传入的参数是Promise对象，则返回对象本身
            return parameter;
        }

        //如果传入的参数不是一个thenable对象，则返回一个新的promise对象，且状态变为fullfilled
        return new MyPromise((resolve) => {
            resolve(parameter);
        })
    }

    reject(reason) {
        //返回一个新的promise实例，该实例的状态为rejected
        return new MyPromise((resolve, reject) => {
            reject(reason);
        })
    }

    all(promiseList) {
        return new MyPromise((resolve, reject) => {
            var count = 0;      //用来统计promiseList中promise实例resolve的个数
            var length = promiseList.length;
            var result = [];    //用来存放promiseList中resolved的promise的返回值

            if(length === 0) {
                //如果传递进来的是空数组，直接resolve
                resolve(result);
            }

            promiseList.forEach((promise, index) => {
                //将数组中的每一个元素都使用Promise.resolve()方法变为promise对象
                MyPromise.resolve(promise).then((value) => {
                    count++;
                    result[index] = value;
                    if(count === length) {
                        //只有当所有的promise实例都resolve，新对象的状态才会变成resolved，
                        //并且将每个promise成功后的返回值组成数组传递给新的promise对象的回调函数
                        return resolve(result);
                    }
                }, (reason) => {
                    //只要有一个promise实例被reject，返回的promise对象的状态就变为rejected，
                    //且第一个被reject的实例对象的返回值会被传递给新的promise对象的回调函数
                    return reject(reason);
                });
            });
        });
    }

    race(promiseList) {
        return new MyPromise((resolve, reject) => {
           let length = promiseList.length;

            if(length === 0){
                return resolve();
            }

            promiseList.forEach((promise) => {
                MyPromise.resolve(promise).then((value) => {
                    //只要有一个promise被resolve，返回的新的promise实例就被resolve
                    return resolve(value);
                }, (reason) => {
                    //只要有一个promise被reject，返回的新的promise实例就被reject
                    return reject(reason);
                });
            });
        });
    }

    catch(onRejected) {
        this.then(null, onRejected);
    }

    finally(callback) {
        //无论如何都会执行callback，并且返回原来的值
        return this.then(
            value => MyPromise.resolve(callback()).then(() => value),
            reason => MyPromise.resolve(callback()).then(() => {throw reason})
        )
    }

    allSettled(promiseList) {
        //只有当所有的promise实例都返回结果（不管是resolve还是reject）才会结束
        //只会被resolve，不会被reject
        return new MyPromise((resolve, reject) => {
            var length = promiseList.length;
            var result = [];
            var count = 0;

            if(length === 0) {
                return resolve(result);
            }

            promiseList.forEach((promise, index) => {
                MyPromise.resolve(promise).then((value) => {
                    count++;
                    result[index] = {
                        status: 'fullfilled',
                        value: value
                    };
                    if(count === length) {
                        return resolve(result);
                    }
                }, (reason) => {
                    count++;
                    result[index] = {
                        status: 'rejected',
                        reason: reason
                    };
                    if(count === length) {
                        return resolve(result);
                    }
                });
            });
        });
    }

    any(promiseList) {
        //只有所有的promise都被reject时，新的promise对象才会被reject
        //一旦由promise被resolve时，新的promise对象就被resolve
        return new MyPromise((resolve, reject) => {
            var length = promiseList.length;
            var count = 0;
            var result = [];

            if(length === 0) {
                return resolve(result);
            }

            promiseList.forEach((promise, index) => {
                MyPromise.resolve(promise).then((value) => {
                    return resolve(value);
                }, (reason) => {
                    count++;
                    result[index] = reason;
                    if(count === length) {
                        return reject(result);
                    }
                });
            });
        });
    }
}

function resolvePromise(promise, x, resolve, reject) {
    //如果promise和x指向同一对象，以TypeError为拒因拒绝执行promise
    if(promise === x) {
        return reject(new TypeError('The promise and the return value are the same'));
    }

    if(x instanceof MyPromise) {
        //如果x为promise，则使promise接受x的状态
        //也就是继续执行x，如果执行的时候拿到了一个y，还要继续解析y
        x.then((y) => {
            resolvePromise(promise, y, resolve, reject);
        }, reject);
    } else if(typeof x === 'object' || typeof x === 'function') {
        //如果x为对象或函数
        if(x === null) {
            return resolve(x);
        }
        try {
            //把x.then赋给then
            var then = x.then;
        } catch(error) {
            return reject(error);
        }

        //如果then是函数
        if(typeof then === 'function') {
            let called = false;         //called表示resolvePromise或者rejectPromise被调用
            //将x作为函数的作用域this调用
            //传递两个回调函数作为参数，第一个参数叫做resolvePromise，第二个参数叫做rejectPromise
            try {
                then.call(
                    x,
                    //如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
                    //resolvePromise
                    (y) => {
                        //如果resolvePromise和rejectPromise均被调用
                        //或者同一参数被调用了多次，则优先采用首次调用并忽略剩下的调用
                        if(called) return;
                        called = true;
                        resolvePromise(promise, y, resolve, reject);
                    },
                    (r) => {
                        if(called) return;
                        called = true;
                        reject(r);
                    }
                );
            } catch(error) {
                //如果调用then方法抛出了异常e,
                //如果resolvePromise或者rejectPromise已经被调用，则忽略之
                if(called) return;
                reject(error);
            }
        } else {
            //如果then不是函数，以x为参数执行promise
            resolve(x);
        }
    } else {
        //如果x不为对象或函数，以x为参数执行promise
        resolve(x);
    }
}

MyPromise.deferred = () => {
    let result = {};
    result.promise = new MyPromise((resolve, reject) => {
        result.resolve = resolve;
        result.reject = reject;
    });

    return result;
}

module.exports = MyPromise;