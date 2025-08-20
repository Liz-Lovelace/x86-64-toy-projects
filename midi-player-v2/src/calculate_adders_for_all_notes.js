const sample_rate = 44100
let adders = []
for (let note_number = 0; note_number < 127; note_number++) {
  let desired_frequency = 440 * 2 ** ((note_number - 69) / 12)
  console.log(desired_frequency)
  let adder = desired_frequency / sample_rate * 65536
  adders.push(`0x${Math.round(adder).toString(16)}`)
}
// process.stdout.write(adders.join(','))
