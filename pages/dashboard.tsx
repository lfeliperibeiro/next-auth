import { useContext, useEffect } from "react";
import { Can } from "../components/Can";
import { AuthContext } from "../contexts/AuthContext";
import { useCan } from "../hooks/useCan";
import { setupAPIClient } from "../services/api";
import { api } from "../services/apiClient";

import { withSSRAuth } from "../utils/withSSRAuth";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  //Usando hooks
  // const userCanSeeMetrics = useCan({
  //   permissions: ["metrics.list"],
  // });

  useEffect(() => {
    api
      .get("/me")
      .then((response) => {
        console.log(response);
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div>
      <h1>Dashboard: {user?.email}</h1>
      {/* {userCanSeeMetrics && <div>Métricas</div>} */}

      {/* Usando Component */}
      <Can permissions={["metrics.list"]}>
        <div>Métricas</div>
      </Can>
    </div>
  );
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIClient(ctx);
  const response = await apiClient.get("/me");
  return {
    props: {},
  };
});
