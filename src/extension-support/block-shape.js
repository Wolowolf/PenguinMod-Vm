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
    SQUARE: 3,

    /**
     * pm: Output shape: octagonal (Crypto, Rigidbodies).
     */
    OCTAGONAL: 6
};

module.exports = BlockShape;
