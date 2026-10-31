/**
 * Desktop fork (section 171): indexOf that looks from both ends of the list at once. Clones are mostly found near one
 * end of the long lists they are in (the oldest or the newest), and the items of these lists are unique.
 * @param {Array} list The list.
 * @param {*} item What to look for.
 * @return {number} Its index, or -1.
 */
const pmFindFromEnds = (list, item) => {
    let start = 0;
    let end = list.length - 1;
    while (start <= end) {
        if (list[start] === item) return start;
        if (list[end] === item) return end;
        start++;
        end--;
    }
    return -1;
};

/**
 * Remove one item from a list in place, like splice(index, 1), moving only the shorter side of the list. shift()
 * needs no copying on long lists, as the engine moves the start of the array instead.
 * @param {Array} list The list.
 * @param {number} index The index to remove.
 */
const pmRemoveAt = (list, index) => {
    if (index < list.length / 2) {
        for (let i = index; i > 0; i--) list[i] = list[i - 1];
        list.shift();
    } else {
        list.splice(index, 1);
    }
};

module.exports = pmFindFromEnds;
module.exports.pmRemoveAt = pmRemoveAt;
