# System circuit execution
Fixed repetition rate execution
Most IBM Quantum systems execute circuits at a fixed rate. Although this repetition rate varies by system, the underlying execution model is the same, and is described here. First, consider three circuits sent to a system using separate jobs, one for each circuit. The example below shows what happens for jobs of varying lengths. Because of the fixed repetition rate, there is a variable amount of idle time that occurs before the start of a circuit in order to make the entire duration match that given by the system repetition rate.

![_images/fixed_single_circuit1.png]
The situation changes somewhat when the same circuits are batched into a single job. In this case the circuits included in the job are executed by iterating over the circuits for each shot requested; the execution is column-wise over a matrix of circuits and shots (see below).

![_images/circuits_shots_matrix1.png]
Matrix of four circuits in a job showing the execution pattern over the circuits.

When submitting batches of circuits to the systems, the circuits are executed differently than they would be if executed separately. Namely, the initialization of the circuit, i.e. prepare the ground state, and measurements (if any) are aligned over all circuits.

![../../../_images/fixed_batch_circuit1.png]
Therefore, each circuit is equal in duration to the longest circuit in the batch, and there is a common idle time that is placed in front of all circuits to match the repetition rate.

Dynamic repetition rate execution
Some IBM Quantum systems allow for dynamic repetition rate execution. These systems are identified in Qiskit using backend.configuration(. editorconfig.Q).dynamic_reprate_enabled, and return a value of True. On these systems, it is possible to manually set the above idle time by setting the rep_delay of the submitted job. One can see from the above figures that by reducing the idle time one can potentially see a greater throughput of circuits on the systems that support dynamic repetition rates. See the the next section on conditional reset for more detailed usage examples.
