// var count = 100;
// var itvLimit = 20;
// var all = [];
// itvExec();

// function itvExec() {
//     var itvCount = 0;
//     var itv = setInterval(function () {
//         all.push(makeArr(count));
//         itvCount++;
//         if (itvLimit === itvCount) {
//             clearInterval(itv);
//             callback();
//         }
//     }, 0);
// }
// var trunk = {};

// function callback() {
//     _(all).map(function (value, index, collenction) {
//         _.forEach(value, function (value) {
//             var id = value.id;
//             var name = value.name;

//             if (trunk[id + name] === undefined) {
//                 trunk[id + name] = [];
//             }
//             trunk[id + name].push(value);
//         });
//     }).value();
//     statstics(trunk);
// }

// function statstics(trunk) {
//     var stts = {};
//     var keys = _.keys(trunk);

//     var arr = _(trunk).forEach(function (value, key, collenction) {
//         var first = value[0], last = value[value.length - 1];
//         var obj = {
//             high: _.maxBy(value, "high").high,
//             low: _.minBy(value, "low").low,
//             first: first.first,
//             last: last.last,
//             volume: last.volume,
//             volumeIncrease: last.volume - first.volume,
//         };
//         stts[key] = obj;
//     });
//     console.log(stts);
// }



// function makeArr(count) {
//     var arr = [];
//     for (var i = 0; i < count; i++) {
//         var obj = {
//             id: "id_" + i % 10,
//             name: "name_" + i % 20,
//             high: Math.floor(Math.random() * 10000) + 1,
//             low: Math.floor(Math.random() * 10000) + 1,
//             first: Math.floor(Math.random() * 10000) + 1,
//             last: Math.floor(Math.random() * 10000) + 1,
//             volume: Math.floor(Math.random() * 10000) + 1,
//             dummy: {
//                 trash: Math.floor(Math.random() * 10000) + 1,
//             }
//         }
//         arr.push(obj);
//     }
//     return arr;
// }

var socket = io.connect('http://localhost:3001');
socket.on('data', function (data) {
    var listDiv = document.getElementById("list");

    var str = "";
    _.forEach(data, function (value, key) {
        if (key > 0) {
            _.forEach(value.list, function (_value, _key) {
                var srt = _(_value).sortBy(function (__value) {
                    return __value.volumeIncrease;
                }).reverse().value();
                console.log("volume", srt);
            });
            _.forEach(value.list, function (_value, _key) {
                var srt = _(_value).sortBy(function (__value) {
                    return __value.priceIncrease;
                }).reverse().value();
                console.log("price", srt);
            });
        }
    });
});
document.addEventListener("DOMContentLoaded", function () {
    var clickBtn = document.getElementById("click");
    clickBtn.addEventListener("click", function (e) {
        socket.emit("call");
    });
});

function makeDiv(even, key) {
    return "<div>" + key + " // high : " + even.high + ", low : " + even.low + ", first : " + even.first + ", last :" + even.last + ", volume : " + even.volume + "</div>";
}
