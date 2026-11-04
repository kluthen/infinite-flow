/**
 * The key and mode suggestion's draw (master spec C6.2): when several candidates are kept, the
 * likeliest comes up most often. The seed is the project's 32-bit FNV-1a hash of a versioned
 * domain string and the quantized doodle's notes (start, length and concert pitch of each): the
 * doodle alone, no session seed and no pseudorandom stream, so the same doodle always draws the
 * same answer, across sessions, reloads and browsers. Each kept candidate weighs an integer read
 * from a table written once from e^(−gap/1000) for every gap of 0 to 693 thousandths from the best
 * (10,000 at the best, about 5,000 at half its chance); the drawn candidate is the one the seed
 * modulo the weights' total falls in, the candidates walked in their order. No transcendental
 * function runs: the table is a literal. Pure, whole numbers only; part of Jam's code (src/jam/).
 */
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { fnv1a32 } from '@/domain/random/hash32'

import { KEPT_GAP, WEIGHT_UNITS_PER_BEAT, type ScoredPair } from './key-suggestion-scores'

/** The versioned domain string the seed hashes before the doodle's notes. */
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
// @spec-link [[module_key_suggestion]]
export const KEY_SUGGESTION_SEED_PREFIX = 'infinite-flow/key-suggestion/v1'

/**
 * The draw weights by gap to the best candidate, in whole thousandths, 0 to 693:
 * round(10,000 × e^(−gap/1000)), written once (the draw's spec checks every entry).
 */
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
// @spec-link [[module_key_suggestion]]
export const GAP_WEIGHTS: readonly number[] = deepFreeze([
  10000, 9990, 9980, 9970, 9960, 9950, 9940, 9930, 9920, 9910, 9900, 9891, 9881, 9871, 9861, 9851,
  9841, 9831, 9822, 9812, 9802, 9792, 9782, 9773, 9763, 9753, 9743, 9734, 9724, 9714, 9704, 9695,
  9685, 9675, 9666, 9656, 9646, 9637, 9627, 9618, 9608, 9598, 9589, 9579, 9570, 9560, 9550, 9541,
  9531, 9522, 9512, 9503, 9493, 9484, 9474, 9465, 9455, 9446, 9436, 9427, 9418, 9408, 9399, 9389,
  9380, 9371, 9361, 9352, 9343, 9333, 9324, 9315, 9305, 9296, 9287, 9277, 9268, 9259, 9250, 9240,
  9231, 9222, 9213, 9204, 9194, 9185, 9176, 9167, 9158, 9148, 9139, 9130, 9121, 9112, 9103, 9094,
  9085, 9076, 9066, 9057, 9048, 9039, 9030, 9021, 9012, 9003, 8994, 8985, 8976, 8967, 8958, 8949,
  8940, 8932, 8923, 8914, 8905, 8896, 8887, 8878, 8869, 8860, 8851, 8843, 8834, 8825, 8816, 8807,
  8799, 8790, 8781, 8772, 8763, 8755, 8746, 8737, 8728, 8720, 8711, 8702, 8694, 8685, 8676, 8668,
  8659, 8650, 8642, 8633, 8624, 8616, 8607, 8598, 8590, 8581, 8573, 8564, 8556, 8547, 8538, 8530,
  8521, 8513, 8504, 8496, 8487, 8479, 8470, 8462, 8454, 8445, 8437, 8428, 8420, 8411, 8403, 8395,
  8386, 8378, 8369, 8361, 8353, 8344, 8336, 8328, 8319, 8311, 8303, 8294, 8286, 8278, 8270, 8261,
  8253, 8245, 8237, 8228, 8220, 8212, 8204, 8195, 8187, 8179, 8171, 8163, 8155, 8146, 8138, 8130,
  8122, 8114, 8106, 8098, 8090, 8082, 8073, 8065, 8057, 8049, 8041, 8033, 8025, 8017, 8009, 8001,
  7993, 7985, 7977, 7969, 7961, 7953, 7945, 7937, 7929, 7922, 7914, 7906, 7898, 7890, 7882, 7874,
  7866, 7858, 7851, 7843, 7835, 7827, 7819, 7811, 7804, 7796, 7788, 7780, 7772, 7765, 7757, 7749,
  7741, 7734, 7726, 7718, 7711, 7703, 7695, 7687, 7680, 7672, 7664, 7657, 7649, 7641, 7634, 7626,
  7619, 7611, 7603, 7596, 7588, 7581, 7573, 7565, 7558, 7550, 7543, 7535, 7528, 7520, 7513, 7505,
  7498, 7490, 7483, 7475, 7468, 7460, 7453, 7445, 7438, 7430, 7423, 7416, 7408, 7401, 7393, 7386,
  7379, 7371, 7364, 7357, 7349, 7342, 7334, 7327, 7320, 7312, 7305, 7298, 7291, 7283, 7276, 7269,
  7261, 7254, 7247, 7240, 7233, 7225, 7218, 7211, 7204, 7196, 7189, 7182, 7175, 7168, 7161, 7153,
  7146, 7139, 7132, 7125, 7118, 7111, 7103, 7096, 7089, 7082, 7075, 7068, 7061, 7054, 7047, 7040,
  7033, 7026, 7019, 7012, 7005, 6998, 6991, 6984, 6977, 6970, 6963, 6956, 6949, 6942, 6935, 6928,
  6921, 6914, 6907, 6900, 6894, 6887, 6880, 6873, 6866, 6859, 6852, 6845, 6839, 6832, 6825, 6818,
  6811, 6805, 6798, 6791, 6784, 6777, 6771, 6764, 6757, 6750, 6744, 6737, 6730, 6723, 6717, 6710,
  6703, 6697, 6690, 6683, 6676, 6670, 6663, 6656, 6650, 6643, 6637, 6630, 6623, 6617, 6610, 6603,
  6597, 6590, 6584, 6577, 6570, 6564, 6557, 6551, 6544, 6538, 6531, 6525, 6518, 6512, 6505, 6499,
  6492, 6486, 6479, 6473, 6466, 6460, 6453, 6447, 6440, 6434, 6427, 6421, 6415, 6408, 6402, 6395,
  6389, 6383, 6376, 6370, 6364, 6357, 6351, 6344, 6338, 6332, 6325, 6319, 6313, 6307, 6300, 6294,
  6288, 6281, 6275, 6269, 6263, 6256, 6250, 6244, 6238, 6231, 6225, 6219, 6213, 6206, 6200, 6194,
  6188, 6182, 6175, 6169, 6163, 6157, 6151, 6145, 6139, 6132, 6126, 6120, 6114, 6108, 6102, 6096,
  6090, 6084, 6077, 6071, 6065, 6059, 6053, 6047, 6041, 6035, 6029, 6023, 6017, 6011, 6005, 5999,
  5993, 5987, 5981, 5975, 5969, 5963, 5957, 5951, 5945, 5939, 5933, 5927, 5921, 5916, 5910, 5904,
  5898, 5892, 5886, 5880, 5874, 5868, 5863, 5857, 5851, 5845, 5839, 5833, 5827, 5822, 5816, 5810,
  5804, 5798, 5793, 5787, 5781, 5775, 5769, 5764, 5758, 5752, 5746, 5741, 5735, 5729, 5724, 5718,
  5712, 5706, 5701, 5695, 5689, 5684, 5678, 5672, 5667, 5661, 5655, 5650, 5644, 5638, 5633, 5627,
  5621, 5616, 5610, 5605, 5599, 5593, 5588, 5582, 5577, 5571, 5565, 5560, 5554, 5549, 5543, 5538,
  5532, 5527, 5521, 5516, 5510, 5505, 5499, 5494, 5488, 5483, 5477, 5472, 5466, 5461, 5455, 5450,
  5444, 5439, 5434, 5428, 5423, 5417, 5412, 5406, 5401, 5396, 5390, 5385, 5379, 5374, 5369, 5363,
  5358, 5353, 5347, 5342, 5337, 5331, 5326, 5321, 5315, 5310, 5305, 5299, 5294, 5289, 5283, 5278,
  5273, 5268, 5262, 5257, 5252, 5247, 5241, 5236, 5231, 5226, 5220, 5215, 5210, 5205, 5200, 5194,
  5189, 5184, 5179, 5174, 5169, 5163, 5158, 5153, 5148, 5143, 5138, 5132, 5127, 5122, 5117, 5112,
  5107, 5102, 5097, 5092, 5086, 5081, 5076, 5071, 5066, 5061, 5056, 5051, 5046, 5041, 5036, 5031,
  5026, 5021, 5016, 5011, 5006, 5001,
])

/** A gap in the scores' units, eighths of a beat, read at its whole thousandths: gap >> 3. */
const UNITS_TO_THOUSANDTHS_SHIFT = 3

/**
 * Intent: the draw's seed for a doodle: FNV-1a over the domain string, then each note as
 * `|start,length,pitch` in the doodle's order.
 */
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
export function keySuggestionSeed(doodle: QuantizedDoodle): number {
  const notes = doodle.notes
    .map((note) => `|${note.startTick},${note.lengthTicks},${note.pitch}`)
    .join('')
  return fnv1a32(`${KEY_SUGGESTION_SEED_PREFIX}${notes}`)
}

/**
 * Intent: a kept candidate's draw weight from its gap to the best, in the scores' units (eighths
 * of a beat, a kept gap at most 693 × 8). A wider gap is a caller defect and throws.
 */
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
export function gapWeight(gap: number): number {
  if (!Number.isSafeInteger(gap) || gap < 0 || gap > KEPT_GAP * WEIGHT_UNITS_PER_BEAT) {
    throw new Error(
      `A kept candidate's gap must be 0 to ${KEPT_GAP} thousandths, got ${gap} units.`,
    )
  }
  return GAP_WEIGHTS[gap >> UNITS_TO_THOUSANDTHS_SHIFT]!
}

/**
 * Intent: the drawn candidate: the one `seed % total` falls in, walking the kept candidates in
 * their order with their weights, the first being the best. No kept candidate is a caller defect.
 */
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
export function drawCandidate(kept: readonly ScoredPair[], seed: number): ScoredPair {
  const best = kept[0]
  if (best === undefined)
    throw new Error('The key suggestion draws among kept candidates; none was given.')
  const weights = kept.map((pair) => gapWeight(pair.penalty - best.penalty))
  let point = (seed >>> 0) % weights.reduce((sum, weight) => sum + weight, 0)
  for (const [index, pair] of kept.entries()) {
    const weight = weights[index]!
    if (point < weight) return pair
    point -= weight
  }
  throw new Error('The key suggestion draw fell past its last candidate.')
}
