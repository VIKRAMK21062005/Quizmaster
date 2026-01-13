import Attempt from "../model/Attempt.js";
import Quiz from "../model/Quiz.js";
import Question from "../model/Question.js";
import Leaderboard from "../model/Leaderboard.js";

// Join Quiz
export const joinPublicQuiz = async (req, res) => {
  const { quizId } = req.params; // Get quizId from the URL parameters

  try {
    // Ensure the quiz ID is provided
    if (!quizId) {
      return res
        .status(400)
        .json({ message: "Quiz ID is required to join a public quiz" });
    }

    // Find the quiz by ID and ensure it's public
    const quiz = await Quiz.findOne({ _id: quizId, type: "public" });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found or not public" });
    }

    // Check if the user has already attempted this quiz
    const existingAttempt = await Attempt.findOne({
      participant: req.user.id,
      quiz: quizId,
    });

    if (existingAttempt) {
      // User has already attempted, allow them to view their results or retake
      return res.status(200).json({
        message: "You have already attempted this quiz",
        canRetake: true,
        previousScore: existingAttempt.score,
        quiz,
      });
    }

    // Check if the user is already in participants list
    if (!quiz.participants.includes(req.user.id)) {
      // Add user to participants list
      quiz.participants.push(req.user.id);
      await quiz.save();
    }

    res.status(200).json({ 
      message: "Joined public quiz successfully", 
      quiz,
      isFirstAttempt: true 
    });
  } catch (error) {
    console.log(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ message: error.message || "Internal Server Error" });
  }
};

export const joinPrivateQuiz = async (req, res) => {
  const { quizCode } = req.body;

  try {
    // Ensure the quiz code is provided
    if (!quizCode) {
      return res
        .status(400)
        .json({ message: "Quiz code is required to join a private quiz" });
    }

    // Find the quiz by code
    const quiz = await Quiz.findOne({ code: quizCode, type: "private" });

    if (!quiz) {
      return res
        .status(404)
        .json({ message: "Invalid quiz code or quiz not found" });
    }

    // Check if the user has already attempted this quiz
    const existingAttempt = await Attempt.findOne({
      participant: req.user.id,
      quiz: quiz._id,
    });

    if (existingAttempt) {
      // User has already attempted, allow them to view their results or retake
      return res.status(200).json({
        message: "You have already attempted this quiz",
        canRetake: true,
        previousScore: existingAttempt.score,
        quiz,
      });
    }

    // Check if the user is already in participants list
    if (!quiz.participants.includes(req.user.id)) {
      // Add user to participants list
      quiz.participants.push(req.user.id);
      await quiz.save();
    }

    res.status(200).json({ 
      message: "Joined private quiz successfully", 
      quiz,
      isFirstAttempt: true 
    });
  } catch (error) {
    console.log(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ message: error.message || "Internal Server Error" });
  }
};

// Submit Answers for Quiz Attempt
export const submitAnswers = async (req, res) => {
  const { quizId, answers } = req.body; // answers is an array of { questionId, userAnswer }
  const userId = req.user.id;

  try {
    // Step 1: Check if the quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Step 2: Fetch all questions for the quiz
    const questions = await Question.find({ quiz: quizId }).lean();
    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "No questions found for this quiz" });
    }

    // Step 3: Check if user has already attempted (optional - allow multiple attempts)
    const existingAttempt = await Attempt.findOne({
      participant: userId,
      quiz: quizId,
    });

    // Step 4: Prepare a map for question details
    const questionMap = {};
    questions.forEach((q) => {
      questionMap[q._id] = {
        text: q.text,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    // Step 5: Evaluate answers and calculate score
    let score = 0;
    const evaluatedAnswers = answers.map((submittedAnswer) => {
      const { questionId, userAnswer } = submittedAnswer;

      const question = questionMap[questionId];
      if (!question) {
        return {
          questionId,
          userAnswer,
          correctAnswer: null,
          isCorrect: false,
          explanation: null,
        };
      }

      const isCorrect =
        String(userAnswer).trim() === String(question.correctAnswer).trim();

      if (isCorrect) score += 1;

      return {
        questionId,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: !isCorrect ? question.explanation : null,
      };
    });

    // Step 6: Save or update the attempt
    let attempt;
    if (existingAttempt) {
      // Update existing attempt
      existingAttempt.answers = evaluatedAnswers;
      existingAttempt.score = score;
      existingAttempt.timeTaken = req.body.timeTaken || 0;
      attempt = await existingAttempt.save();
    } else {
      // Create new attempt
      attempt = new Attempt({
        participant: userId,
        quiz: quizId,
        answers: evaluatedAnswers,
        score,
        timeTaken: req.body.timeTaken || 0,
      });
      await attempt.save();
    }

    // Step 7: Add question text dynamically for the final response
    const responseAnswers = evaluatedAnswers.map((answer) => ({
      questionText:
        questionMap[answer.questionId]?.text || "Question not found",
      ...answer,
    }));

    // Step 8: Update the leaderboard
    let leaderboard = await Leaderboard.findOne({ quiz: quizId });

    if (!leaderboard) {
      leaderboard = new Leaderboard({
        quiz: quizId,
        rankings: [],
      });
    }

    const participantIndex = leaderboard.rankings.findIndex(
      (ranking) => ranking.participant.toString() === userId
    );

    const timeTaken = req.body.timeTaken || 0;

    if (participantIndex >= 0) {
      // Update existing ranking - using direct assignment
      leaderboard.rankings[participantIndex] = {
        participant: userId,
        score: score,
        timeTaken: timeTaken,
        _id: leaderboard.rankings[participantIndex]._id, // Preserve the _id
      };
      leaderboard.markModified('rankings'); // Mark the array as modified
    } else {
      // Add new ranking
      leaderboard.rankings.push({
        participant: userId,
        score,
        timeTaken: timeTaken,
      });
    }

    await leaderboard.save();

    // Step 9: Respond with the results
    res.status(200).json({
      message: existingAttempt 
        ? "Quiz re-submitted successfully" 
        : "Quiz submitted successfully",
      score,
      totalQuestions: questions.length,
      evaluatedAnswers: responseAnswers,
      isRetake: !!existingAttempt,
    });
  } catch (error) {
    console.log(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ message: error.message || "Internal Server Error" });
  }
};