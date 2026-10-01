/**
 * Academic Knowledge Taxonomy & Domain Knowledge Base
 * Provides comprehensive, grounded academic content, progressive learning stages,
 * analogies, examples, and validated diagnostic questions across major CS disciplines.
 */

const ACADEMIC_TAXONOMY = {
  // ==========================================
  // 1. MACHINE LEARNING
  // ==========================================
  "machine learning": {
    aliases: ["ml", "ai and ml", "artificial intelligence", "data science", "machine learning course"],
    topics: {
      "decision trees": {
        aliases: ["decision trees", "decision tree", "dt", "cart", "id3", "c4.5", "tree split", "classification tree", "regression tree"],
        conceptName: "Decision Trees",
        directDefinition: `A **Decision Tree** is a supervised machine learning algorithm used for both classification and regression. It models decision logic by recursively partitioning data into subsets based on feature tests, creating a flowchart-like tree structure of a root node, internal decision nodes, branches, and leaf nodes (which output final predictions).`,
        stages: {
          FOUNDATION: `### 🌲 Decision Trees: Foundational Intuition

**1. What is a Decision Tree?**
A Decision Tree is a supervised learning model that mimics human decision-making. It breaks down complex decisions into a sequence of simple, sequential questions (e.g., "Is age > 25?", "Is income > $50,000?").

**2. Why do we use it?**
- **Interpretability:** You can visualize the exact reasoning path from root to leaf ("White-box model").
- **Versatility:** Handles both numerical and categorical data without requiring feature scaling (normalization).
- **Non-Linear Boundaries:** Easily captures non-linear decision boundaries.

**3. Real-World Scenario (Loan Approval):**
- **Root Question:** Is \`Credit Score > 700\`?
  - **No:** Reject Loan (Leaf Node)
  - **Yes:** Check \`Annual Income > $50,000\`?
    - **Yes:** Approve Loan (Leaf Node)
    - **No:** Require Co-Signer (Leaf Node)`,
          STRUCTURE: `### 📐 Core Structure of a Decision Tree

A Decision Tree consists of 4 structural elements:
1. **Root Node:** The topmost node with no incoming edges. It tests the single most informative feature of the dataset.
2. **Internal (Decision) Nodes:** Intermediate nodes testing specific feature thresholds or conditions.
3. **Branches:** Connections representing the outcome of a test (e.g., "True" vs. "False" or "> 50" vs. "<= 50").
4. **Leaf (Terminal) Nodes:** The bottom nodes containing the final class label (for classification) or predicted value (for regression). No further splits occur here.`,
          DECISION_PROCESS: `### ✂️ The Splitting Decision Process

At each node, the decision tree algorithm searches across all available features to find the split that maximizes **Purity** in the resulting child nodes.
- **Purity:** A node is 100% pure if all samples in it belong to the exact same class.
- **Splitting Criteria:**
  - For **Classification**: Uses *Information Gain (Entropy)* or *Gini Impurity*.
  - For **Regression**: Uses *Variance Reduction (Mean Squared Error)*.`,
          CORE_MECHANICS: `### ⚙️ Core Mechanics: Entropy, Information Gain & Gini Impurity

**1. Shannon Entropy ($H(S)$):**
Measures the disorder or uncertainty in a set of samples $S$:
$$H(S) = -\\sum_{i=1}^c p_i \\log_2(p_i)$$
- Pure node ($100\\%$ one class): $H(S) = 0$
- Maximum uncertainty ($50/50$ split): $H(S) = 1.0$

**2. Information Gain ($IG(S, A)$):**
The expected reduction in entropy achieved by partitioning on attribute $A$:
$$IG(S, A) = H(S) - \\sum_{v \\in \\text{Values}(A)} \\frac{|S_v|}{|S|} H(S_v)$$
The algorithm selects the feature $A$ that maximizes Information Gain.

**3. Gini Impurity:**
$$Gini(S) = 1 - \\sum_{i=1}^c p_i^2$$
Measures the probability of misclassifying a randomly chosen element. Used by the CART algorithm (faster to compute than log-based entropy).`,
          ADVANCED: `### 🚀 Advanced Decision Tree Concepts: Overfitting & Pruning

- **Overfitting Risk:** Deep trees with many levels can memorize training noise (100% training accuracy but poor generalization).
- **Pruning Strategies:**
  - *Pre-Pruning (Early Stopping):* Limit \`max_depth\`, require \`min_samples_split\`, or limit \`max_leaf_nodes\`.
  - *Post-Pruning (Cost-Complexity Pruning):* Grow full tree, then remove branches that provide negligible predictive gain.
- **Ensemble Upgrade:** Combining hundreds of de-correlated decision trees creates a **Random Forest**.`,
        },
        simplified: `Think of a **Decision Tree** like playing a game of **20 Questions** or a doctor's diagnostic chart:
You start at the top question ("Does the patient have a fever?"). Depending on the yes/no answer, you follow a branch to the next specific question until you reach a final diagnosis (leaf node).`,
        socraticQuestions: {
          beginner: "Imagine you want to predict whether a student will pass based on attendance and study hours. What question could the decision tree ask at the very first split (root node)?",
          intermediate: "How does a Decision Tree decide which feature to test first when multiple features are available?",
          advanced: "Why might Information Gain favor features with many distinct unique values (like Student IDs), and how does Gain Ratio address this?",
        },
        diagnosticQuestion: "What does a Leaf Node represent in a Decision Tree?",
        questions: [
          {
            id: "ml_dt_1",
            question: "In a Decision Tree, what is the role and characteristic of a Leaf (Terminal) Node?",
            options: [
              "It contains the final predicted class or continuous value and has no outgoing branches",
              "It tests an input feature condition and splits data into two child nodes",
              "It computes the gradient descent step for weight optimization",
              "It always resides at the root level of the hierarchy",
            ],
            correctAnswerIndex: 0,
            explanation: "Leaf nodes are the terminal endpoints of a decision tree that provide the final prediction without further splitting.",
            conceptTested: "Leaf Node Role",
          },
          {
            id: "ml_dt_2",
            question: "How does the ID3 Decision Tree algorithm select the best feature to split on at each node?",
            options: [
              "By calculating the Information Gain for each feature and selecting the one with the highest gain",
              "By picking the feature with the lowest variance",
              "By randomly selecting a feature using uniform probability",
              "By sorting features alphabetically",
            ],
            correctAnswerIndex: 0,
            explanation: "ID3 uses Information Gain (reduction in Entropy) to greedily select the feature that produces the purest child nodes.",
            conceptTested: "Information Gain Split Selection",
          },
        ],
      },
      "random forest": {
        aliases: ["random forest", "random forests", "rf", "ensemble trees", "bagging trees", "ensemble learning"],
        conceptName: "Random Forest",
        directDefinition: `A **Random Forest** is an ensemble machine learning algorithm that builds a multitude of de-correlated decision trees during training. For classification, it outputs the majority vote of the individual trees; for regression, it averages their individual predictions, significantly reducing model variance and preventing overfitting.`,
        stages: {
          FOUNDATION: `### 🌲🌲 Random Forest: Foundational Intuition

**1. What is a Random Forest?**
A Random Forest is an ensemble of dozens or hundreds of individual Decision Trees trained simultaneously.
- **The Core Idea:** While a single decision tree is prone to high variance (overfitting), averaging many diverse trees cancels out individual errors.

**2. The Dual-Randomness Mechanism:**
1. **Bootstrap Aggregating (Bagging):** Each tree is trained on a random subset of the dataset sampled with replacement.
2. **Feature Randomness:** At each node split, each tree considers only a random subset of features (typically $\\sqrt{p}$ features) rather than all features.

**3. Prediction Aggregation:**
- *Classification:* Majority voting across all trees.
- *Regression:* Arithmetic mean of all tree outputs.`,
        },
        simplified: `Think of **Random Forest** like consulting a panel of **100 independent medical specialists** instead of relying on just 1 doctor:
Each doctor reviews a slightly different set of test results. When you aggregate their diagnoses through a majority vote, the consensus diagnosis is far more reliable and resilient to individual mistakes.`,
        socraticQuestions: {
          beginner: "Why does combining 100 diverse decision trees produce a more reliable prediction than relying on a single deep decision tree?",
        },
        diagnosticQuestion: "How does Random Forest introduce diversity among its individual constituent decision trees?",
        questions: [
          {
            id: "ml_rf_1",
            question: "What two randomization techniques does Random Forest use to ensure diversity across its decision trees?",
            options: [
              "Bootstrap sampling of training data (Bagging) and random feature sub-selection at each split",
              "Randomly dropping weights in a neural network and random gradient inversion",
              "Random shuffling of class labels and random polynomial transformations",
              "Random learning rate scheduling and stochastic batch normalization",
            ],
            correctAnswerIndex: 0,
            explanation: "Random Forest combines Bagging (bootstrap sampling with replacement) with random feature sub-sampling at each split to de-correlate trees.",
            conceptTested: "Random Forest De-correlation Mechanisms",
          },
        ],
      },
      "entropy": {
        aliases: ["entropy", "information entropy", "shannon entropy", "dataset impurity", "entropy in ml"],
        conceptName: "Entropy in Machine Learning",
        directDefinition: `In Information Theory and Machine Learning, **Entropy** is a mathematical metric that quantifies the degree of impurity, disorder, or unpredictability in a dataset. A dataset containing only one class has an entropy of $0$ (pure), whereas a dataset with an even $50/50$ split of two classes has maximum entropy of $1.0$ (highest uncertainty).`,
        stages: {
          FOUNDATION: `### 📊 Entropy: Quantifying Impurity & Uncertainty

**1. Mathematical Formula (Shannon Entropy):**
$$H(S) = -\\sum_{i=1}^c p_i \\log_2(p_i)$$
where $p_i$ is the proportion of samples belonging to class $i$.

**2. Key Values for Binary Classification:**
- **$H(S) = 0$ (Pure Node):** All samples belong to a single class (e.g. 100% Yes, 0% No). Zero uncertainty.
- **$H(S) = 1.0$ (Max Impurity):** Exactly 50% Yes and 50% No. Maximum uncertainty.

**3. Role in Machine Learning:**
Algorithms like ID3 Decision Trees calculate entropy before and after splitting on a feature to compute **Information Gain** ($IG = H_{\\text{parent}} - H_{\\text{children}}$).`,
        },
        simplified: `Think of **Entropy** like a coin flip:
- A double-headed coin has **$0$ Entropy**: you are 100% certain it will land on heads.
- A fair coin has **Maximum Entropy ($1.0$)**: you have complete uncertainty about whether it will land on heads or tails.`,
        socraticQuestions: {
          beginner: "If a dataset at a node contains 100 spam emails and 0 non-spam emails, what is its entropy, and why?",
        },
        diagnosticQuestion: "What is the entropy of a binary dataset node containing 100 samples of class A and 0 samples of class B?",
        questions: [
          {
            id: "ml_ent_1",
            question: "What is the Shannon Entropy value of a binary classification node containing 50 positive samples and 0 negative samples?",
            options: [
              "0.0 (Zero entropy, representing a completely pure subset with no uncertainty)",
              "1.0 (Maximum entropy)",
              "0.5 (Intermediate entropy)",
              "Infinity",
            ],
            correctAnswerIndex: 0,
            explanation: "When all elements in a node belong to the exact same class, p = 1.0 and -1*log2(1) = 0, indicating zero impurity.",
            conceptTested: "Entropy Pure Node Value",
          },
        ],
      },
      "linear regression": {
        aliases: ["linear regression", "regression", "simple linear regression", "least squares", "best fit line", "y = mx + b"],
        conceptName: "Linear Regression",
        directDefinition: `**Linear Regression** is a foundational supervised learning algorithm used to predict continuous numerical values based on one or more independent input features. It fits a straight line ($\hat{y} = mx + b$) that minimizes the Mean Squared Error (MSE) between actual and predicted values.`,
        stages: {
          FOUNDATION: `### 📈 Linear Regression: Foundational Intuition

**1. What is Linear Regression?**
Linear Regression is a supervised learning method used to predict continuous numerical targets (e.g. house prices, stock values, temperatures). Unlike classification (which predicts distinct categories), regression outputs continuous numbers.

**2. Real-World Scenario (House Price Prediction):**
- $1,000\\text{ sq ft} \\rightarrow \\$180,000$
- $1,500\\text{ sq ft} \\rightarrow \\$250,000$
- $2,000\\text{ sq ft} \\rightarrow \\$320,000$
Linear Regression models this upward relationship with a line to predict price for any arbitrary square footage.`,
          STRUCTURE: `### 📐 Core Equation of Linear Regression

$$\\hat{y} = mx + b \\quad \\text{or} \\quad \\hat{y} = w_1 x_1 + w_0$$
- **$x$:** Input feature (e.g. House size).
- **$\\hat{y}$:** Predicted continuous output.
- **$m$ (Slope/Weight):** Rate of change of $\\hat{y}$ per unit change in $x$.
- **$b$ (Intercept/Bias):** Baseline value when $x = 0$.`,
          CORE_MECHANICS: `### ⚙️ Loss Function & Optimization

- **Residuals:** $e_i = y_i - \\hat{y}_i$
- **Cost Function (Mean Squared Error):** $J(w, b) = \\frac{1}{N} \\sum_{i=1}^N (y_i - (w x_i + b))^2$
- **Optimization:** Gradient Descent adjusts $w$ and $b$ to reach the lowest MSE loss.`,
        },
        simplified: `Think of **Linear Regression** like placing a straight wooden ruler across a scatter of dots on a paper to trace the central trend line.`,
        socraticQuestions: {
          beginner: "Suppose house size increases and house price also tends to increase. How could we represent that relationship on a graph?",
        },
        diagnosticQuestion: "In simple linear regression (y = mx + b), what does the slope 'm' represent?",
        questions: [
          {
            id: "ml_lr_1",
            question: "In simple linear regression (y = mx + b), what does the slope 'm' represent?",
            options: [
              "The expected change in the dependent variable (y) for a one-unit change in the independent variable (x)",
              "The value of y when x equals zero (y-intercept)",
              "The total sum of squared residuals across all training samples",
              "The probability that the prediction is statistically significant",
            ],
            correctAnswerIndex: 0,
            explanation: "The slope 'm' measures the rate of change of y relative to a unit increase in x.",
            conceptTested: "Linear Regression Slope Meaning",
          },
        ],
      },
      "overfitting and regularization": {
        aliases: ["overfitting", "regularization", "bias variance", "ridge lasso", "l1 l2", "underfitting"],
        conceptName: "Overfitting & Regularization",
        directDefinition: `**Overfitting** occurs when a machine learning model learns the training data too well — including its random noise and outliers — resulting in near-zero training error but poor generalization (high error) on unseen test data. Regularization (L1 Lasso / L2 Ridge) adds weight penalties to combat overfitting.`,
        stages: {
          FOUNDATION: `### 🧠 Overfitting and the Bias-Variance Tradeoff

- **High Variance (Overfitting):** Model is overly complex and memorizes noise.
- **High Bias (Underfitting):** Model is overly simplistic and misses true trends.
- **L1 Regularization (Lasso):** Adds penalty $\\lambda \\sum |w_i|$ to drive non-essential weights to zero.
- **L2 Regularization (Ridge):** Adds penalty $\\lambda \\sum w_i^2$ to shrink weights smoothly toward zero.`,
        },
        simplified: `Overfitting is memorizing past practice tests word-for-word instead of learning the underlying formulas.`,
        diagnosticQuestion: "How do L1 (Lasso) and L2 (Ridge) regularization differ in their mathematical penalty and weight effect?",
        questions: [
          {
            id: "ml_of_1",
            question: "How do L1 (Lasso) and L2 (Ridge) regularization differ in their mathematical penalty and weight effect?",
            options: [
              "L1 adds absolute weight penalty (drives weights to exactly zero); L2 adds squared weight penalty (shrinks weights smoothly toward zero)",
              "L1 squares gradients, while L2 computes absolute derivatives",
              "L1 prevents underfitting, whereas L2 only applies to decision trees",
              "L1 increases model variance, while L2 strictly reduces training accuracy",
            ],
            correctAnswerIndex: 0,
            explanation: "L1 norm induces sparsity, while L2 norm shrinks weights smoothly.",
            conceptTested: "L1 vs L2 Regularization",
          },
        ],
      },
    },
  },

  // ==========================================
  // 2. DATABASE MANAGEMENT SYSTEMS (DBMS)
  // ==========================================
  "database management systems": {
    aliases: ["dbms", "database", "databases", "sql", "relational database"],
    topics: {
      "normalization": {
        aliases: ["normalization", "normal forms", "1nf", "2nf", "3nf", "bcnf", "functional dependency", "partial dependency", "transitive dependency"],
        conceptName: "Database Normalization",
        directDefinition: `**Database Normalization** is a systematic relational database schema design technique that decomposes relations to minimize data redundancy and eliminate insertion, update, and deletion anomalies.`,
        stages: {
          FOUNDATION: `### 📊 Database Normalization & Normal Forms

**1. What is Database Normalization?**
Normalization structures relational tables to eliminate duplicate data and prevent update, insertion, and deletion anomalies.

**2. Hierarchy of Normal Forms:**
- **1NF (First Normal Form):** All attribute values must be atomic (no arrays or multi-valued fields).
- **2NF (Second Normal Form):** In 1NF and **no partial dependency** (non-prime attributes must depend on the whole candidate key).
- **3NF (Third Normal Form):** In 2NF and **no transitive dependency** (non-prime attributes must depend only on superkeys).
- **BCNF (Boyce-Codd Normal Form):** For every non-trivial $X \\rightarrow Y$, $X$ must strictly be a superkey.`,
        },
        simplified: `Think of **Normalization** like organizing your physical closet: 1NF puts one item per hanger, 2NF organizes items by category, and 3NF prevents writing addresses on every shirt tag.`,
        socraticQuestions: {
          beginner: "If two different rows contain the same student's department information, what problem might occur when that department changes?",
        },
        diagnosticQuestion: "A relation is in Second Normal Form (2NF) if and only if it is in 1NF and satisfies which condition?",
        questions: [
          {
            id: "db_norm_1",
            question: "A relation is in Second Normal Form (2NF) if and only if it is in 1NF and satisfies which condition?",
            options: [
              "No non-prime attribute is partially functionally dependent on any candidate key (no partial dependency)",
              "No non-prime attribute is transitively dependent on any candidate key",
              "Every determinant is a superkey (BCNF condition)",
              "All multivalued dependencies are decomposed into separate tables",
            ],
            correctAnswerIndex: 0,
            explanation: "2NF eliminates partial dependencies.",
            conceptTested: "2NF & Partial Dependency",
          },
        ],
      },
      "transactions and concurrency": {
        aliases: ["transactions", "acid", "concurrency", "2pl", "serializability", "deadlock in dbms"],
        conceptName: "Transactions & Concurrency Control",
        directDefinition: `A **Database Transaction** is a logical unit of database processing that complies with ACID properties (Atomicity, Consistency, Isolation, Durability) to ensure reliable concurrent operations without data corruption.`,
        stages: {
          FOUNDATION: `### 🔒 Transactions & Concurrency Control (ACID & 2PL)

- **Atomicity:** All-or-nothing execution.
- **Consistency:** Database invariants preserved across state transitions.
- **Isolation:** Intermediate execution states are hidden from concurrent transactions.
- **Durability:** Committed updates survive system crashes.`,
        },
        simplified: `Think of an ATM withdrawal: Deducting money and dispensing cash happen together as one atomic unit or not at all.`,
        diagnosticQuestion: "What property does the Two-Phase Locking (2PL) protocol guarantee, and what issue does it NOT prevent?",
        questions: [
          {
            id: "db_tx_1",
            question: "What property does the Two-Phase Locking (2PL) protocol guarantee, and what issue does it NOT prevent?",
            options: [
              "Guarantees Conflict Serializability, but does NOT prevent Deadlocks",
              "Guarantees freedom from Deadlocks, but does NOT ensure Serializability",
              "Guarantees Durability, but does NOT permit Rollbacks",
              "Guarantees instantaneous commit execution across distributed nodes",
            ],
            correctAnswerIndex: 0,
            explanation: "2PL guarantees conflict serializability but can still deadlock.",
            conceptTested: "2PL & Serializability",
          },
        ],
      },
    },
  },

  // ==========================================
  // 3. COMPUTER NETWORKS
  // ==========================================
  "computer networks": {
    aliases: ["cn", "networks", "networking", "computer network", "data communication"],
    topics: {
      "routing and forwarding": {
        aliases: ["routing and forwarding", "routing", "forwarding", "network layer", "packet forwarding", "router", "control plane", "data plane", "longest prefix match", "distance vector", "link state", "ospf", "rip", "bgp"],
        conceptName: "Routing and Forwarding",
        directDefinition: `In computer networks, **Routing** is the control-plane process of determining end-to-end paths for packets across network routers using routing protocols, whereas **Forwarding** is the data-plane action of transferring an arriving packet from an input interface to the appropriate output interface on a single router using its forwarding table.`,
        stages: {
          FOUNDATION: `### 🌐 Routing and Forwarding in Computer Networks

**1. Architectural Separation:**
- **Routing (Control Plane):** Global path calculation using algorithms like OSPF, BGP, or RIP.
- **Forwarding (Data Plane):** Local hardware packet switching across router link interfaces.

**2. Key Mechanisms:**
- **Forwarding Information Base (FIB):** Fast lookup table stored in router memory.
- **Longest Prefix Match:** The router picks the forwarding entry with the most specific matching network prefix.`,
        },
        simplified: `Think of **Routing vs Forwarding** like a road trip: Routing is GPS calculating the route from NYC to LA; Forwarding is taking Exit 42 at a specific highway interchange.`,
        socraticQuestions: {
          beginner: "If a router knows multiple possible paths to a destination, what information could it use to decide which path to send the packet through?",
        },
        diagnosticQuestion: "What is the fundamental architectural difference between Routing and Forwarding in the Network Layer?",
        questions: [
          {
            id: "cn_rf_1",
            question: "What is the fundamental architectural difference between Routing and Forwarding in the Network Layer?",
            options: [
              "Routing operates in the Control Plane (determining end-to-end paths), while Forwarding operates in the Data Plane (transferring packets from input to output port)",
              "Routing operates in the Data Plane on individual switches, while Forwarding handles global path calculation in the Transport Layer",
              "Routing refers exclusively to MAC address switching, while Forwarding refers to DNS hostname resolution",
              "Routing is performed only on client machines, while Forwarding occurs exclusively on web servers",
            ],
            correctAnswerIndex: 0,
            explanation: "Routing computes paths (Control Plane); Forwarding moves packets locally (Data Plane).",
            conceptTested: "Control Plane vs Data Plane Separation",
          },
        ],
      },
    },
  },

  // ==========================================
  // 4. OPERATING SYSTEMS
  // ==========================================
  "operating systems": {
    aliases: ["os", "operating system", "systems programming"],
    topics: {
      "deadlocks": {
        aliases: ["deadlock", "deadlocks", "bankers algorithm", "coffman conditions", "resource allocation", "safe state"],
        conceptName: "Deadlocks in Operating Systems",
        directDefinition: `A **Deadlock** is an operating system state where a set of processes are permanently blocked because every process holds a resource and waits for another resource held by another process in the set.`,
        stages: {
          FOUNDATION: `### 🛑 Deadlocks in Operating Systems

**1. The 4 Coffman Conditions (All 4 must hold simultaneously):**
1. **Mutual Exclusion:** At least one resource is non-shareable.
2. **Hold and Wait:** A process holds resources while requesting more.
3. **No Preemption:** Resources cannot be forcibly taken away.
4. **Circular Wait:** A closed chain of processes each waiting for a resource held by the next.`,
        },
        simplified: `Think of a deadlock like traffic gridlock at a 4-way intersection where every car blocks the next.`,
        socraticQuestions: {
          beginner: "How does imposing a strict global ordering on resource acquisitions eliminate the Circular Wait condition?",
        },
        diagnosticQuestion: "Which four Coffman conditions must hold simultaneously for a Deadlock to occur in an operating system?",
        questions: [
          {
            id: "os_dl_1",
            question: "Which four Coffman conditions must hold simultaneously for a Deadlock to occur in an operating system?",
            options: [
              "Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait",
              "Preemption, Starvation, Priority Inversion, and Race Condition",
              "Atomic Execution, Context Switching, Paging, and Segmentation",
              "First-Come-First-Serve, Shortest Job First, Round Robin, and Priority Scheduling",
            ],
            correctAnswerIndex: 0,
            explanation: "All 4 Coffman conditions must hold simultaneously.",
            conceptTested: "Coffman Conditions",
          },
        ],
      },
    },
  },
};

function cleanStr(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Searches the taxonomy for a subject and topic match
 */
function findTaxonomyTopic(subjectName, topicName) {
  const cleanSub = cleanStr(subjectName);
  const cleanTop = cleanStr(topicName);

  if (!cleanTop && !cleanSub) return null;

  // 1. Exact subject + topic search
  if (cleanSub) {
    for (const [subKey, subData] of Object.entries(ACADEMIC_TAXONOMY)) {
      const isSubMatch =
        cleanSub.includes(subKey) ||
        subKey.includes(cleanSub) ||
        subData.aliases.some((a) => cleanSub.includes(a) || a.includes(cleanSub));

      if (isSubMatch && cleanTop) {
        for (const [topKey, topData] of Object.entries(subData.topics)) {
          const isTopMatch =
            cleanTop === topKey ||
            cleanTop.includes(topKey) ||
            topKey.includes(cleanTop) ||
            topData.aliases.some((a) => cleanTop === a || cleanTop.includes(a) || a.includes(cleanTop));

          if (isTopMatch) {
            return {
              subjectKey: subKey,
              topicKey: topKey,
              ...topData,
            };
          }
        }
      }
    }
  }

  // 2. Cross-subject topic search
  if (cleanTop && cleanTop.length >= 2) {
    for (const [subKey, subData] of Object.entries(ACADEMIC_TAXONOMY)) {
      for (const [topKey, topData] of Object.entries(subData.topics)) {
        const isTopMatch =
          cleanTop === topKey ||
          cleanTop.includes(topKey) ||
          topKey.includes(cleanTop) ||
          topData.aliases.some((a) => cleanTop === a || cleanTop.includes(a) || a.includes(cleanTop));

        if (isTopMatch) {
          return {
            subjectKey: subKey,
            topicKey: topKey,
            ...topData,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Generates subject-grounded questions using taxonomy
 */
function generateAcademicQuestions(subjectName, topicName, count = 3) {
  const match = findTaxonomyTopic(subjectName, topicName);

  if (match && match.questions && match.questions.length > 0) {
    return {
      success: true,
      source: "studex_academic_taxonomy",
      subjectName: subjectName || match.subjectKey,
      topic: topicName || match.conceptName || match.topicKey,
      questions: match.questions.slice(0, count),
    };
  }

  const displayTopic = topicName ? topicName.trim() : "Core Principles";
  const displaySubject = subjectName ? subjectName.trim() : "Academic Discipline";

  return {
    success: true,
    source: "studex_academic_taxonomy",
    subjectName: displaySubject,
    topic: displayTopic,
    questions: [
      {
        id: `q_tax_1`,
        question: `In the study of ${displaySubject}, what is the primary role of ${displayTopic}?`,
        options: [
          `Formulating foundational rules and predictable mechanisms that govern systematic problem solving in ${displayTopic}`,
          `Ignoring formal boundary constraints and relying on unstructured heuristics`,
          `Increasing complexity without meeting functional requirements`,
          `Bypassing systematic validation and hardcoding static constants`,
        ],
        correctAnswerIndex: 0,
        explanation: `In ${displaySubject}, understanding ${displayTopic} requires mastering its theoretical mechanisms and systematic problem-solving rules.`,
        conceptTested: `${displayTopic} Core Concepts`,
      },
    ],
  };
}

/**
 * Returns suggested canonical academic topics for any given subject
 */
function getSuggestedTopicsForSubject(subjectName) {
  const cleanSub = cleanStr(subjectName);

  for (const [subKey, subData] of Object.entries(ACADEMIC_TAXONOMY)) {
    const isMatch =
      cleanSub.includes(subKey) ||
      subKey.includes(cleanSub) ||
      subData.aliases.some((a) => cleanSub.includes(a) || a.includes(cleanSub));

    if (isMatch) {
      return Object.keys(subData.topics).map((t) => {
        return t
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      });
    }
  }

  return ["Core Foundations", "Problem Sets & Proofs", "Exam Review"];
}

module.exports = {
  ACADEMIC_TAXONOMY,
  findTaxonomyTopic,
  generateAcademicQuestions,
  getSuggestedTopicsForSubject,
};
