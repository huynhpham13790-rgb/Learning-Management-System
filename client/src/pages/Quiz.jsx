import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Loader, fmtDate, fmtScore, useFetch } from '../components/ui.jsx';

export default function Quiz() {
  const { id } = useParams();
  const state = useFetch(() => api.get(`/quizzes/${id}`), [id]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setResult(await api.post(`/quizzes/${id}/attempt`, { answers }));
    window.scrollTo(0, 0);
    state.reload();
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <Loader state={state}>
      {(quiz) => (
        <>
          <p className="small">
            <Link to={`/courses/${quiz.course_id}`}>← {quiz.course_title}</Link>
          </p>
          <h1>{quiz.title}</h1>
          {result ? (
            <>
              <div className={`card alert ${result.score >= 5 ? 'ok' : 'error'}`}>
                <h2>
                  Điểm: {result.score}/10 ({result.correct}/{result.total} câu đúng)
                </h2>
                <button className="btn" onClick={retry}>
                  Làm lại
                </button>
              </div>
              {result.detail.map((d, i) => (
                <div key={d.question_id} className={`card question ${d.correct ? 'right' : 'wrong'}`}>
                  <b>
                    Câu {i + 1}. {d.question}
                  </b>
                  <ul>
                    {d.options.map((o, oi) => (
                      <li
                        key={oi}
                        className={oi === d.correct_index ? 'correct' : Number(d.chosen) === oi ? 'chosen-wrong' : ''}
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                  {d.explanation && <small className="muted">💡 {d.explanation}</small>}
                </div>
              ))}
            </>
          ) : (
            <form onSubmit={submit}>
              {quiz.questions.map((q, i) => (
                <fieldset key={q.id} className="card question">
                  <legend>
                    Câu {i + 1}. {q.question}
                  </legend>
                  {q.options.map((o, oi) => (
                    <label key={oi} className="option">
                      <input
                        type="radio"
                        name={`q${q.id}`}
                        checked={answers[q.id] === oi}
                        onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                      />
                      {o}
                    </label>
                  ))}
                </fieldset>
              ))}
              <div className="row-between">
                <small className="muted">
                  Đã trả lời {Object.keys(answers).length}/{quiz.questions.length}
                </small>
                <button className="btn primary">Nộp bài</button>
              </div>
            </form>
          )}
          {quiz.attempts.length > 0 && (
            <section className="card">
              <h2>Lịch sử làm bài</h2>
              <ul className="list">
                {quiz.attempts.map((a) => (
                  <li key={a.id}>
                    <b>{fmtScore(a.score)}/10</b> <small className="muted">{fmtDate(a.created_at)}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Loader>
  );
}
