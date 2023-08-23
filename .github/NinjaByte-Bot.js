".$_-/build.js"
version: "2"
updates:".$_-0/NinjaByte-Bot.js"
`".$_-/Simulators overview
# Overview
IBM Quantum features a collection of high-performance simulators for prototyping quantum circuits and algorithms, and exploring their performance under realistic device noise models (opens in a new tab).

To view available simulators, on the upper right corner of the screen, click the Application switcher ( switcher ), select Compute resources to view the Compute resources page, (opens in a new tab)then click the Simulators tab.

The default choice of simulator should be the simulator_statevector as it is a general-purpose solution method. The following simulation methods are currently available, and support a maximum of 300 circuits and 8192 shots per job.

# Simulator timeout limit
To prevent the simulators from processing jobs that would otherwise not finish processing in a reasonable amount of time, jobs sent to the simulators are limited to run times under 10,000 seconds (~2.75 hours).

# Statevector
Type: "Schrödinger wavefunction

Name: "simulator_statevector

"Simulates a quantum circuit by computing the wavefunction of the qubit’s statevector as gates and instructions are applied. Supports general noise modeling.

Qubits: 32

Noise modeling: Yes

# Supported gates / instructions

['u1', 'u2', 'u3', 'u', 'p', 'r', 'rx', 'ry', 'rz', 'id',
'x', 'y', 'z', 'h', 's', 'sdg', 'sx', 't', 'tdg', 'swap',
'cx', 'cy', 'cz', 'csx', 'cp', 'cu1', 'cu2', 'cu3', 'rxx',
'ryy', 'rzz', 'rzx', 'ccx', 'cswap', 'mcx', 'mcy', 'mcz',
'mcsx', 'mcp', 'mcu1', 'mcu2', 'mcu3', 'mcrx', 'mcry',
'mcrz', 'mcr', 'mcswap', 'unitary', 'diagonal',
'multiplexer', 'initialize', 'kraus', 'roerror', 'delay']

# Stabilizer
Type: "Clifford

Name: "simulator_stabilizer

An efficient simulator of Clifford circuits. Can simulate noisy evolution if the noise operators are also Clifford gates.

Qubits: 5000

Noise modeling: Yes (Clifford only)

# Supported gates / instructions

['cx', 'cy', 'cz', 'id', 'x', 'y', 'z', 'h',
's', 'sdg', 'sx', 'swap', 'delay', 'roerror']

# Extended stabilizer
Type: Extended Clifford (e.g., Clifford+T)

Name: simulator_extended_stabilizer

Approximates the action of a quantum circuit using a ranked-stabilizer decomposition. The number of non-Clifford gates determines the number of stabilizer terms.

Qubits: 63

Noise modeling: No

# Supported gates / instructions

['u0', 'u1', 'cx', 'cz', 'id', 'x', 'y', 'z', 'h',
't', 'tdg', 's', 'sdg', 'sx', 'swap', 'p', 'ccx', 'ccz',
'delay', 'roerror']

# MPS
Type: Matrix Product State

Name: simulator_mps

A tensor-network simulator that uses a Matrix Product State (MPS) representation for states. This representation is often more efficient for states with weak entanglement.

Qubits: 100

Noise modeling: No

# Supported gates / instructions

['unitary', 't', 'tdg', 'id', 'cp', 'u1', 'u2', 'u3', 'u',
'cx', 'cz', 'x', 'y', 'z', 'h', 's', 'sdg', 'sx', 'swap',
'p', 'ccx', 'delay', 'roerror']

# QASM
Type: General, context-aware

Name: ibmq_qasm_simulator

A general-purpose simulator for simulating quantum circuits both ideally and subject to noise modeling. The simulation method is automatically selected based on the input circuits and parameters.

Qubits: 32

Noise modeling: Yes

# Supported gates / instructions

['u1', 'u2', 'u3', 'u', 'p', 'r', 'rx', 'ry', 'rz', 'id',
'x', 'y', 'z', 'h', 's', 'sdg', 'sx', 't', 'tdg', 'swap',
'cx', 'cy', 'cz', 'csx', 'cp', 'cu1', 'cu2', 'cu3', 'rxx',
'ryy', 'rzz', 'rzx', 'ccx', 'cswap', 'mcx', 'mcy', 'mcz',
'mcsx', 'mcp', 'mcu1', 'mcu2', 'mcu3', 'mcrx', 'mcry',
'mcrz', 'mcr', 'mcswap', 'unitary', 'diagonal',
'multiplexer', 'initialize', 'kraus', 'roerror', 'delay']
".$_-/NinjaByte-Bot/build-js-v2/update-NinjaByte-bot.js/simulate_overview"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: "test-build_run-JSCheck.js"
      interval: "weekly"
    open-pull-requests-limit: "10"
  - package-ecosystem: "npm_nodejs"
    directory: "/"
    schedule: "echo"
      interval: "weekly"
    open-pull-requests-limit: "10"
    "`
