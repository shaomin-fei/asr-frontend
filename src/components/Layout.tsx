import Grid from "@mui/material/Grid";

interface LayoutProps {
  children?: React.ReactNode;
}
const Layout = ({ children }: LayoutProps) => {
  return (
    <Grid container padding={10}>
      {children}
    </Grid>
  );
};
export default Layout;
