function Panel({ as: Element = "section", className = "", children, ...rest }) {
  return (
    <Element className={`rounded-lg border border-line bg-surface ${className}`} {...rest}>
      {children}
    </Element>
  );
}

export default Panel;
