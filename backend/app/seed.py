"""
Seed the database with AI/ML concepts for the MVP.
"""
from sqlalchemy.orm import Session
from .models import Concept


CONCEPTS = [
    {
        "id": "overfitting",
        "name": "Overfitting",
        "description": (
            "Overfitting occurs when a model learns the training data too well, "
            "including its noise and idiosyncrasies, and therefore performs poorly "
            "on unseen data. The classic symptom is a large gap between training "
            "accuracy (high) and validation/test accuracy (much lower)."
        ),
        "difficulty": "beginner",
        "diagnostic_question": (
            "A model achieves 98% accuracy on the training set but only 61% on a held-out test set. "
            "What is the most likely explanation, and what does this tell us about generalisation?"
        ),
        "correct_answer": (
            "The model is overfitting. High training accuracy with significantly lower test accuracy "
            "indicates it has memorised the training data rather than learning patterns that generalise."
        ),
        "common_misconceptions": [
            "Confuses training accuracy with generalisation / ability to perform on unseen data",
            "Believes higher training accuracy always means a better model",
            "Thinks overfitting only happens with neural networks",
        ],
        "reassessment_question": (
            "True or False, and explain: “A model with 99% training accuracy must be good at generalising "
            "to new data.”"
        ),
        "reassessment_answer": (
            "False. Extremely high training accuracy can be a sign of overfitting; generalisation is measured "
            "by performance on data the model has never seen."
        ),
    },
    {
        "id": "bias_variance",
        "name": "Bias-Variance Tradeoff",
        "description": (
            "Bias is the error from overly simplistic assumptions (underfitting). "
            "Variance is the error from sensitivity to small fluctuations in the training set (overfitting). "
            "The goal is to find a model complexity that balances both."
        ),
        "difficulty": "intermediate",
        "diagnostic_question": (
            "A very simple linear model underperforms on both training and test data. "
            "A very deep neural net fits the training data almost perfectly but fails on the test set. "
            "Name the two problems and the underlying tradeoff."
        ),
        "correct_answer": (
            "The linear model has high bias (underfitting). The deep net has high variance (overfitting). "
            "This illustrates the bias-variance tradeoff."
        ),
        "common_misconceptions": [
            "Thinks bias and variance are the same thing",
            "Believes more complex models are always better",
            "Confuses bias-variance with the precision-recall tradeoff",
        ],
        "reassessment_question": (
            "If you increase model complexity, what typically happens to bias and to variance?"
        ),
        "reassessment_answer": (
            "Bias tends to decrease while variance tends to increase."
        ),
    },
    {
        "id": "train_val_test",
        "name": "Train / Validation / Test Splits",
        "description": (
            "Training set is used to fit parameters. Validation set is used for hyperparameter tuning "
            "and model selection. Test set is used only once for a final, unbiased estimate of performance. "
            "Never tune on the test set."
        ),
        "difficulty": "beginner",
        "diagnostic_question": (
            "Why should you never use the test set for hyperparameter tuning or early stopping decisions?"
        ),
        "correct_answer": (
            "Because any decision made using the test set leaks information about it into the model-selection "
            "process, making the final reported metric optimistically biased and no longer a true estimate "
            "of performance on unseen data."
        ),
        "common_misconceptions": [
            "Thinks validation and test sets are interchangeable",
            "Believes it is fine to look at test metrics during development",
            "Does not understand data leakage through repeated evaluation",
        ],
        "reassessment_question": (
            "You have already used the validation set to choose learning rate and regularisation strength. "
            "Can you now use the same validation set to report your final performance number? Why or why not?"
        ),
        "reassessment_answer": (
            "No. The validation set has already influenced model choices, so it is no longer unbiased. "
            "Final performance should be reported on a held-out test set that was never used for decisions."
        ),
    },
    {
        "id": "regularization",
        "name": "Regularization (L1 / L2)",
        "description": (
            "Regularization adds a penalty to the loss function to discourage overly complex models. "
            "L2 (Ridge) shrinks weights continuously; L1 (Lasso) can drive weights to exactly zero, "
            "performing feature selection."
        ),
        "difficulty": "intermediate",
        "diagnostic_question": (
            "What is the main purpose of adding an L2 penalty to the loss, and how does it differ from L1?"
        ),
        "correct_answer": (
            "L2 penalises large weights to reduce overfitting by keeping the model simpler. "
            "Unlike L1, L2 does not produce sparse solutions; it shrinks weights toward zero but rarely makes them exactly zero."
        ),
        "common_misconceptions": [
            "Thinks regularization is only for neural networks",
            "Believes L1 and L2 do the same thing",
            "Thinks higher regularization always improves test accuracy",
        ],
        "reassessment_question": (
            "If your model is underfitting, should you increase or decrease the regularization strength? Why?"
        ),
        "reassessment_answer": (
            "Decrease it. Strong regularization constrains the model too much, increasing bias. "
            "Reducing the penalty allows the model to fit the data better."
        ),
    },
    {
        "id": "gradient_descent",
        "name": "Gradient Descent",
        "description": (
            "Gradient descent iteratively updates model parameters in the direction that reduces the loss. "
            "The learning rate controls step size. Too large → divergence; too small → slow convergence."
        ),
        "difficulty": "beginner",
        "diagnostic_question": (
            "What happens if the learning rate is set too high during gradient descent?"
        ),
        "correct_answer": (
            "The parameter updates become too large, the loss may oscillate or diverge, and the optimisation "
            "fails to converge to a good minimum."
        ),
        "common_misconceptions": [
            "Thinks a higher learning rate always trains faster",
            "Believes gradient descent always finds the global minimum",
            "Confuses learning rate with the number of epochs",
        ],
        "reassessment_question": (
            "You observe the training loss jumping up and down wildly. What is the most likely cause related to the optimiser?"
        ),
        "reassessment_answer": (
            "The learning rate is probably too high, causing the updates to overshoot the minimum repeatedly."
        ),
    },
        {
        "id": "classification_metrics",
        "name": "Classification Metrics",
        "description": (
            "Classification metrics measure different aspects of prediction quality. "
            "Precision focuses on how many predicted positives are actually positive, "
            "while recall focuses on how many actual positives the model successfully identifies. "
            "The right metric depends on the cost of false positives and false negatives."
        ),
        "difficulty": "intermediate",
        "diagnostic_question": (
            "A medical screening model should identify as many patients with a disease as possible, "
            "even if some healthy patients are incorrectly flagged. Should you prioritize precision "
            "or recall, and why?"
        ),
        "correct_answer": (
            "Recall should be prioritized because the goal is to identify as many actual positive cases "
            "as possible. A false negative means a patient with the disease is missed, while some false "
            "positives may be acceptable in this screening scenario."
        ),
        "common_misconceptions": [
            "Confuses precision with recall",
            "Thinks higher accuracy always means a better classifier",
            "Does not distinguish false positives from false negatives",
        ],
        "reassessment_question": (
            "A fraud detection system should catch as many fraudulent transactions as possible, "
            "even if some legitimate transactions are flagged. Should it prioritize precision or recall? "
            "Explain your reasoning."
        ),
        "reassessment_answer": (
            "Recall should be prioritized because the goal is to catch as many actual fraudulent "
            "transactions as possible. This means reducing false negatives, even if some legitimate "
            "transactions are incorrectly flagged as fraud."
        ),
    },
]

def seed_concepts(db: Session) -> None:
    for c in CONCEPTS:
        existing = db.query(Concept).filter(Concept.id == c["id"]).first()
        if not existing:
            db.add(Concept(**c))
    db.commit()
