import { useState } from "react";
import api from "../../service/ApiService";
import ApiRoutes from "../../utils/ApiRoutes";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import backgroundImage from "../../assets/auth.jpg";

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!formData.name || !formData.email || !formData.password) {
        toast.error("Please fill in all fields");
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        setLoading(false);
        return;
      }

      // Validate password length
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }

      // Send form data to the API
      let response = await api.post(ApiRoutes.SIGNUP.path, formData, {
        authenticate: ApiRoutes.SIGNUP.authenticate,
      });

      toast.success(response.message || "Account created successfully!");
      
      // Clear form
      setFormData({
        name: "",
        email: "",
        password: "",
      });
      
      // Redirect to login page after successful signup
      navigate("/");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error?.response?.data?.message || "Error occurred! Please try again!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className='h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat backdrop-blur-3xl'
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className='flex flex-col w-96 items-center justify-center px-6 pb-12 mx-auto md:h-screen lg:py-0'>
        <div className='w-full bg-white rounded-lg shadow md:mt-0 sm:max-w-md xl:p-0 sm:min-w-96 lg:mb-9 lg:mt-10'>
          <div className='p-6 space-y-4 md:space-y-6 sm:p-8'>
            <h1 className='text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl'>
              Sign up for your account
            </h1>
            <form onSubmit={handleSignUp} className='space-y-4 md:space-y-6'>
              <div>
                <label
                  htmlFor='name'
                  className='block mb-2 text-sm font-medium text-gray-900'
                >
                  Your name
                </label>
                <input
                  type='text'
                  name='name'
                  id='name'
                  className='bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-gray-900 focus:border-gray-900 block w-full p-2.5'
                  placeholder='Your Name'
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label
                  htmlFor='email'
                  className='block mb-2 text-sm font-medium text-gray-900'
                >
                  Your email
                </label>
                <input
                  type='email'
                  name='email'
                  id='email'
                  className='bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-gray-900 focus:border-gray-900 block w-full p-2.5'
                  placeholder='name@company.com'
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor='password'
                  className='block mb-2 text-sm font-medium text-gray-900'
                >
                  Password
                </label>
                <input
                  type='password'
                  name='password'
                  id='password'
                  placeholder='••••••••'
                  className='bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-gray-900 focus:border-gray-900 block w-full p-2.5'
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full text-white bg-gray-900 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? (
                  <>
                    <svg
                      className='animate-spin h-5 w-5 mr-3 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C6.477 0 2 4.477 2 10h2zm2 5.291A7.962 7.962 0 014 12H0c0 2.137.84 4.077 2.207 5.457l1.793-1.166z'
                      ></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </button>
              <p className='text-sm font-light text-gray-500'>
                Already have an account?{" "}
                <Link
                  to='/'
                  className='font-medium text-gray-900 hover:underline'
                >
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUp;