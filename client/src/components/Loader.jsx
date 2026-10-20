/** Simple loading indicator used across pages. */
export default function Loader({ label = 'Loading…', large = false }) {
  return (
    <div className="loading-block" role="status">
      <div className={large ? 'spinner spinner-lg' : 'spinner'} />
      <p>{label}</p>
    </div>
  );
}
