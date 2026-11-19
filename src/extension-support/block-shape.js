/**
 * Types of block shapes
 * @enum {number}
 */
const BlockShape = {
    /**
     * Output shape: hexagonal (booleans/predicates).
     */
    HEXAGONAL: 1,

    /**
     * Output shape: rounded (numbers/strings).
     */
    ROUND: 2,

    /**
     * Output shape: squared.
     */
    SQUARE: 3
};

module.exports = BlockShape;
