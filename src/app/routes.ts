import { createBrowserRouter } from "react-router";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import LearningPath from "./pages/LearningPath";
import Practice from "./pages/Practice";
import MockExam from "./pages/MockExam";
import Community from "./pages/Community";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "learning-path", Component: LearningPath },
      { path: "practice", Component: Practice },
      { path: "mock-exam", Component: MockExam },
      { path: "community", Component: Community },
      { path: "admin", Component: Admin },
    ],
  },
  {
    path: "/login",
    Component: Login,
  },
]);
