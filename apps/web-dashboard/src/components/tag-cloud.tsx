interface TagCloudPoint {
  label: string;
  value: number;
}

interface TagCloudProps {
  title: string;
  points: TagCloudPoint[];
}

export const TagCloud = ({ title, points }: TagCloudProps) => {
  const max = points.reduce((currentMax, point) => Math.max(currentMax, point.value), 0) || 1;
  const slug = title.replace(/\s+/g, "-").toLowerCase();
  const titleId = `${slug}-title`;

  return (
    <section className="tag-cloud" aria-labelledby={titleId}>
      <h3 className="tag-cloud__title" id={titleId}>
        {title}
      </h3>
      <ul className="tag-cloud__list" aria-label={title}>
        {points.map((point) => {
          const scale = 0.85 + (point.value / max) * 0.7;

          return (
            <li className="tag-cloud__item" key={point.label}>
              <span
                className="tag-cloud__tag"
                style={{ fontSize: `${scale}rem` }}
                aria-label={`${point.label} ${point.value}`}
              >
                {point.label}
              </span>
              <span className="tag-cloud__value">{point.value}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
