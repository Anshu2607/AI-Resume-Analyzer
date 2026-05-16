import axios from "axios";

const API = "http://localhost:8081/auth";

export const registerUser = async (userData) => {
  const response = await axios.post(`${API}/register`, userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await axios.post(`${API}/login`, userData);
  return response.data;
};

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    "http://localhost:8081/api/resume/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const getAnalysisHistory = async () => {
  const response = await axios.get(
    "http://localhost:8081/api/resume/history"
  );
  return response.data;
};

export const deleteAnalysis = async (id) => {
  const response = await axios.delete(
    `http://localhost:8081/api/resume/${id}`
  );
  return response.data;
};