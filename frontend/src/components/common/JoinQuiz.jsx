import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import NavBar from "./NavBar";
import api from "../../service/ApiService";
import ApiRoutes from "../../utils/ApiRoutes";
import { TbTargetArrow } from "react-icons/tb";
import { MdLeaderboard } from "react-icons/md";
import { AiOutlineSearch } from "react-icons/ai";

const JoinQuiz = () => {
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [privateQuizCode, setPrivateQuizCode] = useState("");
  const [showPrivateQuizModal, setShowPrivateQuizModal] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const navigate = useNavigate();

  // Fetch all public quizzes
  useEffect(() => {
    const fetchPublicQuizzes = async () => {
      try {
        const path = ApiRoutes.GETALLQUIZZES.PATH;
        const authenticate = ApiRoutes.GETALLQUIZZES.authenticate;
        const response = await api.get(path, { authenticate });

        if (response) {
          setPublicQuizzes(response);
        } else {
          toast.error("Failed to fetch public quizzes.");
        }
      } catch (error) {
        console.error("Error fetching public quizzes:", error);
        toast.error("Error occurred while fetching public quizzes.");
      }
    };

    fetchPublicQuizzes();
  }, []);

  // Search quizzes by name or creator
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query.");
      return;
    }

    try {
      const path = `${ApiRoutes.SEARCHQUIZ.PATH}?name=${searchQuery}`;
      const authenticate = ApiRoutes.SEARCHQUIZ.authenticate;
      const response = await api.get(path, { authenticate });

      if (response) {
        setPublicQuizzes(response); // Update quizzes with search results
      } else {
        toast.error("No quizzes found for your search.");
      }
    } catch (error) {
      console.error("Error searching quizzes:", error);
      toast.error("Error occurred while searching for quizzes.");
    }
  };

  // Join a public quiz
  const handleJoinPublicQuiz = async (quizId) => {
    try {
      const path = ApiRoutes.JOINPUBLICQUIZ.PATH.replace(":quizId", quizId);
      const authenticate = ApiRoutes.JOINPUBLICQUIZ.authenticate;
      const response = await api.post(path, {}, { authenticate });

      if (response) {
        // Check if user has already attempted
        if (response.canRetake) {
          setSelectedQuiz({
            id: quizId,
            previousScore: response.previousScore,
            name: response.quiz.name,
          });
          setShowRetakeModal(true);
        } else {
          toast.success("Successfully joined the public quiz!");
          navigate(`/questions/quiz/${quizId}`);
        }
      }
    } catch (error) {
      console.error("Error joining public quiz:", error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.message;
        if (errorMsg?.includes("already attempted")) {
          toast.error("You have already attempted this quiz. Redirecting to retake...");
          navigate(`/questions/quiz/${quizId}`);
        } else {
          toast.error(errorMsg || "Cannot join this quiz.");
        }
      } else {
        toast.error("Error occurred while joining the public quiz.");
      }
    }
  };

  // Confirm retake
  const handleConfirmRetake = () => {
    setShowRetakeModal(false);
    navigate(`/questions/quiz/${selectedQuiz.id}`);
  };

  // Cancel retake and view previous results
  const handleViewResults = () => {
    setShowRetakeModal(false);
    toast.info(`Your previous score: ${selectedQuiz.previousScore}`);
  };

  // Join a private quiz
  const handleJoinPrivateQuiz = async () => {
    if (!privateQuizCode) {
      toast.error("Please enter a valid quiz code.");
      return;
    }

    try {
      const path = ApiRoutes.JOINPRIVATEQUIZ.PATH;
      const authenticate = ApiRoutes.JOINPRIVATEQUIZ.authenticate;
      const response = await api.post(
        path,
        { quizCode: privateQuizCode },
        { authenticate }
      );

      if (response) {
        // Check if user has already attempted
        if (response.canRetake) {
          setSelectedQuiz({
            id: response.quiz._id,
            previousScore: response.previousScore,
            name: response.quiz.name,
          });
          setShowPrivateQuizModal(false);
          setShowRetakeModal(true);
        } else {
          toast.success("Successfully joined the private quiz!");
          setShowPrivateQuizModal(false);
          navigate(`/questions/quiz/${response.quiz._id}`);
        }
      }
    } catch (error) {
      console.error("Error joining private quiz:", error);
      
      if (error.response?.status === 404) {
        toast.error("Invalid quiz code. Please check and try again.");
      } else if (error.response?.data?.message?.includes("already attempted")) {
        toast.error("You have already attempted this quiz.");
      } else {
        toast.error("Error occurred while joining the private quiz.");
      }
    }
  };

  // Navigate to the leaderboard page
  const handleLeaderboard = (quizId) => {
    navigate(`/participants/getLeaderboard/${quizId}`);
  };

  return (
    <div>
      <NavBar />
      <div className='min-h-screen flex flex-col items-center mt-10 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl w-full bg-white p-6 shadow-lg rounded-lg'>
          <div className='flex justify-between mb-6'>
            <h1 className='text-4xl font-bold text-gray-900'>Join a Quiz</h1>
            <button
              onClick={() => setShowPrivateQuizModal(true)}
              className='px-4 py-2 bg-gray-900 text-white font-bold rounded-md hover:bg-black'
            >
              Join a Private Quiz
            </button>
          </div>

          {/* Search Bar */}
          <div className='mb-6 flex items-center'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by quiz name or creator'
              className='px-4 py-2 border border-gray-300 rounded-md mr-4 w-full outline-none'
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className='flex items-center px-4 py-2 rounded-md bg-white text-black border border-black hover:bg-black hover:text-white'
            >
              <AiOutlineSearch className='mr-2' />
              Search
            </button>
          </div>

          {/* Public Quizzes Table */}
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    S.No
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Quiz Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Creator
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {publicQuizzes.length > 0 ? (
                  publicQuizzes.map((quiz, index) => (
                    <tr key={quiz._id}>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {index + 1}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {quiz.name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {quiz.creator?.name || "Unknown"}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right'>
                        <div className='flex flex-col md:flex-row md:justify-end gap-2'>
                          <button
                            onClick={() => handleJoinPublicQuiz(quiz._id)}
                            className='flex items-center px-4 py-2 rounded-md bg-white text-black border border-black hover:bg-black hover:text-white'
                          >
                            <TbTargetArrow className='mr-2' />
                            Attempt
                          </button>
                          <button
                            onClick={() => handleLeaderboard(quiz._id)}
                            className='flex items-center px-4 py-2 rounded-md bg-white text-black border border-black hover:bg-black hover:text-white'
                          >
                            <MdLeaderboard className='mr-2' />
                            Leaderboard
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan='4'
                      className='px-6 py-4 text-center text-gray-500'
                    >
                      No public quizzes available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Retake Confirmation Modal */}
      {showRetakeModal && (
        <div
          className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
          aria-modal='true'
          role='dialog'
        >
          <div className='bg-white p-6 rounded-md shadow-lg max-w-md w-full'>
            <h2 className='text-xl font-bold mb-4'>Quiz Already Attempted</h2>
            <p className='mb-4'>
              You have already attempted "{selectedQuiz?.name}".
              <br />
              <span className='font-semibold'>Previous Score: {selectedQuiz?.previousScore}</span>
            </p>
            <p className='mb-4 text-sm text-gray-600'>
              Would you like to retake the quiz? Your new score will replace the previous one.
            </p>
            <div className='flex justify-end gap-2'>
              <button
                onClick={handleViewResults}
                className='px-4 py-2 bg-gray-300 text-gray-900 font-bold rounded-md hover:bg-gray-400'
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRetake}
                className='px-4 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700'
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Quiz Modal */}
      {showPrivateQuizModal && (
        <div
          className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
          aria-modal='true'
          role='dialog'
        >
          <div className='bg-white p-6 rounded-md shadow-lg max-w-sm w-full'>
            <h2 className='text-xl font-bold mb-4'>Enter Private Quiz Code</h2>
            <input
              type='text'
              value={privateQuizCode}
              onChange={(e) => setPrivateQuizCode(e.target.value)}
              placeholder='Enter Quiz Code'
              className='w-full px-3 py-2 border border-gray-300 rounded-md mb-4'
              onKeyPress={(e) => e.key === 'Enter' && handleJoinPrivateQuiz()}
            />
            <div className='flex justify-end gap-2'>
              <button
                onClick={() => setShowPrivateQuizModal(false)}
                className='px-4 py-2 bg-gray-300 text-gray-900 font-bold rounded-md hover:bg-gray-400'
              >
                Cancel
              </button>
              <button
                onClick={handleJoinPrivateQuiz}
                className='px-4 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700'
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinQuiz;